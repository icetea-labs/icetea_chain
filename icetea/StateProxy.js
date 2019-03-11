const _ = require('lodash')
const config = require('./config')
const { deepFreeze } = require('./helper/utils')

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
    (k.startsWith('contract_') && k.endsWith(deployedBy)) ? (t + 1) : t
  ), 0)

  return 'contract_' + count + '_' + deployedBy
}

const _srcFor = (contractAddress, { stateTable, deployedContracts }) => {
  const state = (deployedContracts && deployedContracts[contractAddress]) ||
        (stateTable && stateTable[contractAddress])
  if (!state || !state.src) {
    throw new Error(`The address specified is not a valid deployed contract: ${contractAddress}`)
  }

  return {
    deployedBy: state.deployedBy,
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
      storage = _.cloneDeep(contractStorage) // consider using immer to improve performance
      storages[contractAddress] = storage
    }
    if (readonly && storage) {
      deepFreeze(storage) // this is a trade-off, dev (debug) over user (performance)
    }
  }

  const getState = (key, defaultValue) => {
    if (!key || typeof key !== 'string') {
      throw new Error(`Expect key to be an non-empty string, but got ${key}`)
    }
    if (!storage) return defaultValue

    const value = storage[key]
    return typeof value !== 'undefined' ? value : defaultValue
  }

  const hasState = key => {
    if (!key || typeof key !== 'string') {
      throw new Error(`Expect key to be an non-empty string, but got ${key}`)
    }
    return storage ? storage.hasOwnProperty(key) : false
  }

  let transfer, setState, deleteState

  if (readonly) {
    [transfer, setState, deleteState] = _makeNotAllowed(['transfer', 'setState', 'deleteState'])
  } else {
    setState = (key, value) => {
      if (!key || typeof key !== 'string') {
        throw new Error(`Expect key to be an non-empty string, but got ${key}`)
      }
      if (!storage) {
        storage = { [key]: value }
        storages[contractAddress] = storage
      } else {
        storage[key] = value
      }
    }

    deleteState = key => {
      if (storage) {
        delete storage[key]
      }
    }

    transfer = (to, value) => {
      if (!value) return

      _incBalance(contractAddress, -value)
      _incBalance(to, value)
    }
  }

  return {
    hasState,
    getState,
    setState,
    deleteState,
    transfer
  }
}

const getMetaProxy = (stateTable) => {
  return {
    tools: {
      getCode: (contractAddress) => _srcFor(contractAddress, { stateTable })
    }
  }
}

const getStateProxy = (stateTable) => {
  const balances = {}
  const storages = {}
  const deployedContracts = {}

  const _incBalance = (addr, value) => {
    value = parseFloat(value)
    if (!value) return

    if (balances.hasOwnProperty(addr)) {
      balances[addr] += value
    } else {
      balances[addr] = balanceOf(addr) + value
    }
  }

  const balanceOf = (addr) => {
    if (balances.hasOwnProperty(addr)) {
      return balances[addr]
    }
    return (deployedContracts[addr] || stateTable[addr] || {}).balance || 0
  }

  const deployContract = (deployedBy, state) => {
    const contractAddress = _generateContractAddress(deployedBy, stateTable)
    deployedContracts[contractAddress] = state
    return contractAddress
  }

  const refectTxValueAndFee = tx => {
    (tx.value + tx.fee) && _incBalance(tx.from, -tx.value - tx.fee)
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
      getCode: (contractAddress) => _srcFor(contractAddress, { stateTable, deployedContracts }),
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
      if (value < 0) {
        throw new Error(`Account ${addr} does not have enough balance: ${value}.`)
      }
      stateTable[addr] = stateTable[addr] || {}
      stateTable[addr].balance = value
    })
  }

  return stateTable
}

module.exports = { getStateProxy, getMetaProxy, applyChanges }
