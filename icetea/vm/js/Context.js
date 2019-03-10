const utils = require('../../helper/utils')
const invoker = require('../../ContractInvoker')

function _makeLoadContract (invokerTypes, srcContract, options) {
  return destContract => {
    return new Proxy({}, {
      get (obj, method) {
        const tx = { from: srcContract }
        const newOpts = { ...options, tx, ...tx }
        return _makeInvokableMethod(invokerTypes, destContract, method, newOpts)
      }
    })
  }
}

function _makeInvokableMethod (invokerTypes, destContract, method, options) {
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

exports.forTransaction = (contractAddress, methodName, methodParams, options) => {
  const { tx, block, stateAccess, tools } = options

  const msg = {}
  msg.name = methodName
  msg.params = methodParams
  msg.sender = tx.from
  msg.value = tx.value
  msg.fee = tx.fee
  msg.callType = (msg.value > 0) ? 'payable' : 'transaction'
  utils.deepFreeze(msg)

  const contractHelpers = stateAccess.forUpdate(contractAddress)
  const { deployedBy } = tools.getCode(contractAddress)
  const tags = {}

  const ctx = {
    ...contractHelpers,
    address: contractAddress,
    deployedBy,
    get balance () {
      return tools.balanceOf(contractAddress)
    },
    getEnv: () => ({
      msg,
      block,
      tags,
      loadContract: _makeLoadContract(['invokeUpdate', 'invokeView', 'invokePure'], contractAddress, options)
    }),
    emitEvent: (eventName, eventData, indexes = []) => {
      utils.emitEvent(contractAddress, tags, eventName, eventData, indexes)
    }
  }

  return Object.freeze(ctx) // prevent from changing address, balance, etc.
}

exports.forView = (contractAddress, name, params, options) => {
  const { from, block, stateAccess, tools } = options

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

  const contractHelpers = stateAccess.forView(contractAddress)
  const { deployedBy } = tools.getCode(contractAddress)

  const ctx = {
    ...contractHelpers,
    address: contractAddress,
    deployedBy,
    get balance () {
      return tools.balanceOf(contractAddress)
    },
    getEnv: () => ({
      msg,
      block,
      loadContract: _makeLoadContract(['invokeView', 'invokePure'], contractAddress, options)
    })
  }

  return Object.freeze(ctx)
}

exports.forPure = (address, name, params, { from }) => {
  const ctx = {
    address,
    getEnv: () => ({ msg: { sender: from, name, params, callType: 'pure' } })
  }

  return utils.deepFreeze(ctx)
}

exports.forMetadata = {
  getEnv: () => ({ msg: { callType: 'metadata', name: '__metadata' }, block: {} })
}
