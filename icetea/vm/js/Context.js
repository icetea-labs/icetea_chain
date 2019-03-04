const _ = require('lodash')
const utils = require('../../helper/utils')
const invoker = require('../../ContractInvoker')

function makeInvokableMethod (invokerTypes, destContract, method, options) {
  return invokerTypes.reduce((obj, t) => {
    obj[t] = (...params) => {
      return invoker[t](destContract, method, params, options)
    }
    return obj
  }, {})
}

exports.for = (invokeType, contractAddress, methodName, methodParams, options) => {
  const map = {
    transaction: exports.forTransaction,
    view: exports.forView,
    pure: exports.forPure
  }

  const fn = map[invokeType] ? map[invokeType] : exports.forMetadata
  return typeof fn === 'function' ? fn(contractAddress, methodName, methodParams, options) : fn
}

exports.forTransaction = (contractAddress, methodName, methodParams, { tx, block, stateTable }) => {
  const msg = {}
  msg.name = methodName
  msg.params = Object.freeze(methodParams) // contract still can change if some param is object
  msg.sender = tx.from
  msg.value = tx.value || 0
  msg.fee = tx.fee || 0
  msg.callType = (msg.value > 0) ? 'payable' : 'transaction'
  Object.freeze(msg)

  const state = stateTable[contractAddress].state || {}
  const balance = stateTable[contractAddress].balance || 0
  const tags = {}

  const ctx = {
    address: contractAddress,
    balance,
    getEnv: () => ({
      msg,
      block,
      tags,
      balanceOf: (addr) => utils.balanceOf(addr, stateTable),
      loadContract: (to) => {
        return new Proxy({}, {
          get (obj, method) {
            const tx = { from: contractAddress }
            const options = { tx, ...tx, block, stateTable }
            return makeInvokableMethod(['invokeUpdate', 'invokeView', 'invokePure'], to, method, options)
          }
        })
      }
    }),
    transfer: (to, value) => {
      ctx.balance -= value
      utils.decBalance(contractAddress, value, stateTable)
      utils.incBalance(to, value, stateTable)
      utils.emitTransferred(contractAddress, tags, contractAddress, to, value)
    },
    _state: {},
    hasState: (key) => {
      return ctx._state.hasOwnProperty(key) || state.hasOwnProperty(key)
    },
    getState: (key, defVal) => {
      return ctx._state.hasOwnProperty(key) ? ctx._state[key] : (state.hasOwnProperty(key) ? state[key] : defVal)
    },
    setState: (key, value) => {
      const old = ctx.getState(key)
      ctx._state[key] = value
      return old
    },
    emitEvent: (eventName, eventData, indexes = []) => {
      utils.emitEvent(contractAddress, tags, eventName, eventData, indexes)
    }
  }

  return Object.freeze(ctx) // prevent from changing address, balance, etc.
}

exports.forView = (contractAddress, name, params, options) => {
  const { from, block, stateTable } = options
  const msg = new Proxy({ name, params, sender: from, callType: 'view' }, {
    get (target, prop) {
      if (Object.keys(msg).includes(prop) && !['name', 'params', 'callType', 'sender'].includes(prop)) {
        throw new Error('Cannot access msg.' + prop + ' when calling a view function')
      }
      return Reflect.get(target, prop)
    },
    set () {
      throw new Error('msg properties are readonly.')
    }
  })

  const state = _.cloneDeep(stateTable[contractAddress].state || {})
  const balance = stateTable[contractAddress].balance || 0

  const ctx = {
    address: contractAddress,
    balance,
    getEnv: () => ({
      msg,
      block,
      balanceOf: (addr) => utils.balanceOf(addr, stateTable),
      loadContract: (to) => {
        return new Proxy({}, {
          get (obj, method) {
            const tx = { from: contractAddress }
            const options = { tx, ...tx, block, stateTable }
            return makeInvokableMethod(['invokeView', 'invokePure'], to, method, options)
          }
        })
      }
    }),
    transfer: () => {
      throw new Error('Cannot transfer inside a view function.')
    },
    hasState: (key) => {
      return state.hasOwnProperty(key)
    },
    getState: (key) => {
      return state[key] // if contract change it's props, it'll be ignored anyway
    },
    setState: () => {
      throw new Error('Cannot change state inside a view function.')
    },
    emitEvent: () => {
      throw new Error('Cannot emit event inside a view function.')
    }
  }

  return Object.freeze(ctx)
}

exports.forPure = (address, name, params, { from }) => {
  const ctx = {
    address,
    get balance () {
      throw new Error('Cannot view balance a pure function')
    },
    getEnv: () => ({ msg: { sender: from, name, params, callType: 'pure' } })
  }

  return Object.freeze(ctx)
}

exports.forMetadata = {
  getEnv: () => ({ msg: { callType: 'metadata', name: '__metadata' }, block: {} })
}
