const _ = require('lodash')
const utils = require('../../helper/utils')
const Worker = require('../../ContractExecutor')

exports.for = (invokeType, contractAddress, methodName, methodParams, options) => {

}

exports.forTransaction = (contractAddress, methodName, methodParams, {tx, block, stateTable}) => {
  const msg = {}
  msg.name = methodName
  msg.params = Object.freeze(methodParams) // contract still can change if some param is object
  msg.sender = tx.from
  msg.value = tx.value || 0
  msg.fee = tx.fee || 0
  msg.callType = (msg.value > 0) ? 'payable' : 'transaction'
  msg = Object.freeze(msg)

  const state = stateTable[address].state || {}
  const balance = stateTable[address].balance || 0
  const tags = {}

  const ctx = {
    address: contractAddress,
    balance,
    getEnv: () => ({ 
      msg,
      block,
      tags,
      loadContract: (to) => {
        const worker = new Worker(stateTable)
        return new Proxy({}, {
          get (obj, method) {
            const real = obj[method]
            if (!real) {
              return (...params) => {
                const tx = { from: contractAddress }
                return worker.invokeUpdate(to, method, params, {tx, block, stateTable})
              }
            }
            return real
          }
        })
      }
    }),
    transfer: (to, value) => {
      ctx.balance -= value
      utils.decBalance(address, value, stateTable)
      utils.incBalance(to, value, stateTable)
      utils.emitTransferred(address, tags, address, to, value)
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
      utils.emitEvent(address, tags, eventName, eventData, indexes)
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
      throw new Error("msg properties are readonly.")
    }
  })

  const state = _.cloneDeep(stateTable[address].state || {})
  const balance = stateTable[address].balance || 0

  const ctx = {
    address: contractAddress,
    balance,
    getEnv: () => ({
      msg,
      block,
      loadContract: (addr) => {
        const worker = new Worker(stateTable)
        return new Proxy({}, {
          get (obj, method) {
            const real = obj[method]
            if (!real) {
              return (...params) => worker.invokeView(addr, method, params, { 
                from: contractAddress,
                stateTable
              })
            }
            return real
          }
        })
      } }),
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

exports.forPure = (address, name, params, {from}) => {
  const ctx = {
    address,
    get balance () {
      throw new Error('Cannot view balance a pure function')
    },
    getEnv: () => ({msg: { sender: from, name, params, callType: 'pure' }})
  }

  return Object.freeze(ctx)
}

exports.forMetadata = {
  getEnv: () => ({ msg: { callType: 'metadata', name: '__metadata' }, block: {} }),
}
