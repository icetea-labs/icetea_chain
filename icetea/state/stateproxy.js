const _ = require('lodash')
const { query } = require('query')
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

const _checkCustomizer = customizer => {
  if (customizer == null) return Object
  if (customizer === false) return undefined
  return customizer
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
      // storage = contractStorage.system ? contractStorage : _.cloneDeep(contractStorage)
      // storage = contractStorage
      storage = _.cloneDeep(contractStorage)
      storages[contractAddress] = storage
    }
    // if (readonly && storage && !storage.system) {
    //   deepFreeze(storage) // this is a trade-off, dev (debug) over user (performance)
    // }
  }

  const getState = (path, defaultValue) => {
    if (!storage) return defaultValue
    const v = _.get(storage, _checkPath(path))
    if (v === undefined) return defaultValue
    return _.cloneDeep(v)
  }

  const hasState = path => {
    if (!storage) return false
    return _.has(storage, _checkPath(path))
  }

  const getStateKeys = ({ path, filter } = {}) => {
    const o = path == null ? storage : getState(path)
    if (o == null) return []

    const keys = Object.keys(o)
    if (filter && typeof filter !== 'function') {
      throw new Error('Filter is not a function.')
    }

    return !filter ? keys : keys.filter(filter)
  }

  const countState = (path, filter) => {
    const results = getState(path)
    if (results == null) {
      return 0
    }

    if (filter == null) {
      // event if it is an array, we will use Object.keys
      // to skip empty (deleted) item in the middle
      return Object.keys(results).length
    } else {
      if (typeof results.filter === 'function') {
        // filter always removes empty array item, so can use length
        return results.filter(filter).length
      } else {
        const entries = typeof results.entries === 'function' ? results.entries() : Object.entries(results)
        let count = 0
        for (const [key, value] of entries) {
          if (filter(value, key)) count++
        }
        return count
      }
    }
  }

  // a powerful version of getState, used to query list (object, array, Map, Set)
  // this func always return array
  const queryState = (path, actionGroups, options = {}) => {
    let results = getState(path)

    if (results == null) {
      // since this fn is for list query, always return array
      // return []

      // should not return [] because some function like some, every would return boolean
      results = []
    }

    if (actionGroups == null) {
      actionGroups = []
    } else if (!Array.isArray(actionGroups)) {
      actionGroups = [actionGroups]
    }

    const actLikeArray = typeof results.filter === 'function' &&
    typeof results.map === 'function' &&
    typeof results.slice === 'function'

    if (!actLikeArray) {
      // convert it to array

      const {
        noTransform,
        keyName = 'id',
        keyType,
        valueName = 'value'
      } = options

      // Note: if 'results' cannot be converted, caller should not specify 'optionArray' anyway
      // Note: string will be convert to array of chars

      results = Array.from(
        typeof results[Symbol.iterator] === 'function' ? results : Object.entries(results),
        noTransform
          ? undefined
          : v => {
            if (v && v.length === 2) {
              const [key, value] = v
              const valueObj = typeof value === 'object' ? value : { [valueName]: value }
              return { ...valueObj, [keyName]: keyType === 'number' ? Number(key) : key }
            }
            return v
          })
    }

    // should move to config
    const DEF_ROW_COUNT = 30
    const MAX_ROW_COUNT = 100

    if (!actionGroups.length) return results.slice(0, DEF_ROW_COUNT)

    const call = (group, name, useLodash, ...args) => {
      const action = group[name]
      if (!action) return
      results = useLodash ? _[name](results, action, ...args) : results[name](action, ...args)
    }

    actionGroups.forEach(group => {
      const {
        search,
        fields,
        count,
        addCount,
        reduceInitialValue,
        orderByOrders,
        begin,
        end
      } = group

      call(group, 'map')

      if (search != null) {
        results = query(results, search)
      }

      call(group, 'find', true)
      call(group, 'filter', true)
      call(group, 'some', true)
      call(group, 'every', true)
      call(group, 'reduce', false, reduceInitialValue)
      call(group, 'orderBy', true, orderByOrders)
      ;['countBy',
        'sumBy',
        'meanBy',
        'minBy',
        'maxBy'].forEach(name => call(group, name, true))

      call(group, 'reverse', false)

      let rawLength = 0
      if (Array.isArray(results)) {
        const sliceFrom = begin || 0
        let sliceEnd = end == null ? sliceFrom + DEF_ROW_COUNT : end
        if (sliceEnd - sliceFrom > MAX_ROW_COUNT) {
          sliceEnd = sliceFrom + MAX_ROW_COUNT
        }
        rawLength = results.length
        results = results.slice(sliceFrom, sliceEnd)
      }

      if (fields != null) {
        const fn = typeof fields !== 'function' ? _.pick : _.pickBy
        results = results.map(o => fn(o, fields))
      }

      if (count === true) {
        if (typeof results === 'object' && results !== null) {
          results = Array.isArray(results) ? results.length : Object.keys(results).length
        } else {
          results = 1
        }
      }

      if (addCount) {
        results.push(rawLength)
      }
    })

    return results
  }

  let transfer, setState, deleteState, ensureState, invokeState, patchState, mergeState

  if (readonly) {
    [transfer, setState, deleteState, ensureState, invokeState, patchState, mergeState] =
      _makeNotAllowed(['transfer', 'setState', 'deleteState', 'ensureState', 'invokeState', 'patchState', 'mergeState'])
  } else {
    setState = (path, value, customizer) => {
      path = _checkPath(path)
      if (!storage) {
        storage = {}
        storages[contractAddress] = storage
      }
      if (typeof value === 'function') {
        _.updateWith(storage, path, oldValue => stateSerializer.sanitize(value(oldValue)), _checkCustomizer(customizer))
      } else {
        const newValue = stateSerializer.sanitize(value)
        _.setWith(storage, path, newValue, _checkCustomizer(customizer))
      }
    }

    mergeState = (path, value, customizer) => {
      path = _checkPath(path)
      if (!storage) {
        storage = { }
        storages[contractAddress] = storage
      }
      _.updateWith(
        storage,
        path,
        oldValue => {
          const value2Merge = typeof value !== 'function' ? value : value(oldValue)
          const sanitizedValue = stateSerializer.sanitize(value2Merge)
          return { ...oldValue, ...sanitizedValue }
        },
        _checkCustomizer(customizer)
      )
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
    invokeState = (path, initialValue, funcName, ...args) => {
      const o = ensureState(path, initialValue)
      if (o != null && typeof o[funcName] === 'function') {
        return o[funcName](...stateSerializer.sanitize(args))
      }

      throw new Error('Cannot invoke the function name specified.')
    }

    deleteState = (path, subKeys) => {
      if (!storage) return false

      path = _checkPath(path)

      if (subKeys == null) {
        return _.unset(storage, path)
      }

      const o = _.get(storage, path)
      if (o == null) return false

      let deleted = false
      subKeys.forEach(key => {
        const d = delete o[key]
        d && (deleted = true)
      })

      return deleted
    }

    /*
      [
        { type = 'set' path='5' value='100'/params=[] }
      ]
    */
    patchState = (operations, basePath) => {
      if (!operations || Array.isArray(operations)) {
        throw new Error('operations must be an array of operations.')
      }
      if (basePath != null) {
        basePath = _checkPath(basePath)
      }

      const mapTypes = {
        set: setState,
        ensure: ensureState,
        invoke: invokeState,
        delete: deleteState,
        push: (path, value) => invokeState(path, [], 'push', value),
        splice: (path, ...params) => invokeState(path, [], 'splice', ...params)
      }

      operations.forEach(op => {
        if (op != null) {
          const fn = typeof op.type === 'function' ? op.type : mapTypes[op.type]
          if (typeof fn !== 'function') {
            throw new Error('Operation type is not valid.')
          }

          const path = basePath == null ? op.path : basePath.concat(Array.isArray(op.path) ? op.path : [op.path])
          if (op.params) {
            fn(path, ...op.params)
          } else {
            fn(path, op.value)
          }
        }
      })
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
    countState,
    queryState,
    ensureState,
    setState,
    mergeState,
    deleteState,
    invokeState,
    patchState,
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
