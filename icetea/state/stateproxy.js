const _ = require('lodash')
const config = require('../config')
// const { deepFreeze, validateAddress } = require('../helper/utils')
const { validateAddress } = require('../helper/utils')
const stateSerializer = require('./serializer').getSerializer()

const { ecc, codec } = require('@iceteachain/common')

// This class purpose is to improve performance
// By reduce the amount of deepClone when state is large

/*
1. Contracts could view (by calling 'view' methods):
 - its own storage
 - other accounts' balances
2. Contracts could change (by sending transaction):
 - its own storage
 - transfer its balance to other account
 - deploy new contracts

 Contracts not allow to touch other state (src, meta, etc.).
*/

const _checkPath = path => {
  if (!path || (!Array.isArray(path) && typeof path !== 'string')) {
    throw new Error(`Expect path to be an non-empty string or array, but got ${path}`)
  }

  return typeof path === 'string' ? [path] : path
}

const _makeNotAllowed = (operations, mode = 'view') => {
  return operations.reduce((funcs, op) => {
    funcs.push(() => {
      throw new Error(`${op} is not allowed in '${mode}' mode.`)
    })
    return funcs
  }, [])
}

const _generateContractAddress = (deployedBy, stateTable) => {
  // make new address for smart contract
  // should be deterministic

  // TODO: change this

  const count = Object.keys(stateTable).reduce((t, k) => (
    (stateTable[k].src && stateTable[k].deployedBy === deployedBy) ? (t + 1) : t
  ), 0)

  const id = count + '_' + deployedBy
  return ecc.toContractAddress(id)
}

const _srcFor = (contractAddress, { stateTable, deployedContracts }, errorMessage) => {
  const state = (deployedContracts && deployedContracts[contractAddress]) ||
        (stateTable && stateTable[contractAddress])
  if (!state || !(state.src || state.system)) {
    throw new Error(errorMessage || `The address specified is not a valid deployed contract: ${contractAddress}`)
  }

  return {
    deployedBy: state.deployedBy,
    system: !!state.system,
    mode: state.mode || 0,
    src: state.src,
    meta: state.meta
  }
}

const _stateforAddress = (contractAddress, readonly, {
  stateTable,
  storages,
  _incBalance
}) => {
  let storage = storages[contractAddress]

  if (!storage) {
    const contractStorage = (stateTable[contractAddress] || {}).storage
    if (contractStorage) {
      // consider using immer instead of cloneDeep to improve performance
      // or use serialization to avoid the Proxy which often introduces problems
      // or don't allow regular object access (like ImmutableJS),
      // which make state objects less "suger" but more controllable without Proxy
      // in the end, should consider write-on-copy somehow
      storage = contractStorage.system ? contractStorage : _.cloneDeep(contractStorage)
      storages[contractAddress] = storage
    }
    // if (readonly && storage && !storage.system) {
    //   deepFreeze(storage) // this is a trade-off, dev (debug) over user (performance)
    // }
  }

  const getStateKeys = () => {
    if (!storage) return []

    return Object.keys(storage)
  }

  const getState = (path, defaultValue) => {
    if (!storage) return defaultValue
    return _.get(storage, _checkPath(path), defaultValue)
  }

  const hasState = path => {
    if (!storage) return false
    return _.has(storage, _checkPath(path))
  }

  let transfer, setState, deleteState, ensureState, invokeState

  if (readonly) {
    [transfer, setState, deleteState, ensureState, invokeState] =
      _makeNotAllowed(['transfer', 'setState', 'deleteState', 'ensureState', 'invokeState'])
  } else {
    setState = (path, value, customizer) => {
      path = _checkPath(path)
      if (!storage) {
        storage = { }
        storages[contractAddress] = storage
      }
      if (typeof value === 'function') {
        _.updateWith(storage, path, oldValue => stateSerializer.sanitize(value(oldValue)), customizer)
      } else {
        _.setWith(storage, path, stateSerializer.sanitize(value), customizer)
      }
    }

    // similar to getState but create if not exist
    ensureState = (path, value, customizer) => {
      if (!hasState(path)) {
        setState(path, value, customizer)
      }

      return getState(path)
    }

    // e.g. push to an array
    // invokeState('key', [], 'push', 'some value')
    // e.g. push to a Set
    // invokeState('key', new Set(), 'add', 'some value')
    invokeState = (path, initialValue, funcName, stateValue, ...args) => {
      const o = ensureState(path, initialValue)
      if (o != null && typeof o[funcName] === 'function') {
        return o[funcName](stateSerializer.sanitize(stateValue), ...args)
      }

      throw new Error('Cannot invoke the function name specified.')
    }

    deleteState = path => {
      if (storage) {
        return _.unset(storage, path)
      }
      return false
    }

    transfer = (to, value) => {
      if (!value) return

      _incBalance(contractAddress, -value)
      _incBalance(to, value)
    }
  }

  return {
    getStateKeys,
    hasState,
    getState,
    ensureState,
    setState,
    deleteState,
    invokeState,
    transfer
  }
}

const getMetaProxy = (stateTable) => {
  return {
    tools: {
      getCode: (contractAddress, errorMessage) => _srcFor(contractAddress, { stateTable }, errorMessage)
    }
  }
}

const getStateProxy = (stateTable) => {
  const balances = {}
  const storages = {}
  const deployedContracts = {}

  const _incBalance = (addr, value) => {
    validateAddress(addr)
    if (codec.isRegularAddress(addr)) {
      throw new Error('Cannot transfer to regular account.')
    }

    if (!value) return
    value = BigInt(value)

    if (Object.prototype.hasOwnProperty.call(balances, addr)) {
      balances[addr] += value
    } else {
      balances[addr] = balanceOf(addr) + value
    }
  }

  const balanceOf = (addr) => {
    if (Object.prototype.hasOwnProperty.call(balances, addr)) {
      return balances[addr]
    }
    return (deployedContracts[addr] || stateTable[addr] || {}).balance || BigInt(0)
  }

  const deployContract = (deployedBy, state) => {
    const contractAddress = _generateContractAddress(deployedBy, stateTable)
    deployedContracts[contractAddress] = state
    return contractAddress
  }

  const refectTxValueAndFee = tx => {
    (tx.value + tx.fee) && _incBalance(tx.payer, -tx.value - tx.fee)
    tx.value && _incBalance(tx.to, tx.value)
    tx.fee && _incBalance(config.feeCollector, tx.fee)
  }

  const forAddress = (contractAddress, readonly) => {
    return _stateforAddress(contractAddress, readonly, { stateTable, storages, _incBalance })
  }

  const cacheView = {}
  const cacheUpdate = {}

  return {
    stateAccess: {
      forView: (contractAddress) => (
        cacheView[contractAddress] || (cacheView[contractAddress] = forAddress(contractAddress, true))
      ),
      forUpdate: (contractAddress) => (
        cacheUpdate[contractAddress] || (cacheUpdate[contractAddress] = forAddress(contractAddress, false))
      )
    },
    patch: {
      deployedContracts, // newly deployed contracts
      storages, // storage of own contract (for contract calls)
      balances // balance changes, for transfer
    },
    tools: {
      getCode: (contractAddress, errorMessage) => _srcFor(contractAddress, { stateTable, deployedContracts }, errorMessage),
      balanceOf,
      deployContract,
      refectTxValueAndFee
    }
  }
}

const applyChanges = (stateTable, { deployedContracts, storages, balances }) => {
  Object.assign(stateTable, deployedContracts)

  Object.keys(storages).forEach(addr => {
    // Because we deep cloned, should be ok with direct assignment, no need for _.merge?
    stateTable[addr].storage = storages[addr]
  })

  if (balances) {
    Object.keys(balances).forEach(addr => {
      const value = balances[addr]
      stateTable[addr] = stateTable[addr] || {}
      stateTable[addr].balance = value
    })
  }

  return stateTable
}

module.exports = { getStateProxy, getMetaProxy, applyChanges }
