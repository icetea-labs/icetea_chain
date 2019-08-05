/**
 * An MVP implementation of gate contract.
 */

const { checkMsg } = require('../helper/types')
const crypto = require('crypto')
const _ = require('lodash')

const METADATA = Object.freeze({
  'registerProvider': {
    decorators: ['transaction'],
    params: [
      { name: 'options', type: ['object', 'undefined'] }
    ],
    returnType: 'undefined'
  },
  'changeProviderOptions': {
    decorators: ['transaction'],
    params: [
      { name: 'options', type: ['object', 'undefined'] }
    ],
    returnType: 'undefined'
  },
  'unregisterProvider': {
    decorators: ['transaction'],
    params: [],
    returnType: 'undefined'
  },
  'request': {
    decorators: ['transaction'],
    params: [
      { name: 'path', type: ['string', 'object'] },
      { name: 'options', type: ['object', 'undefined'] }
    ],
    returnType: 'undefined'
  },
  'getRequest': {
    decorators: ['view'],
    params: [
      { name: 'requestId', type: 'string' }
    ],
    returnType: 'any'
  },
  'setResult': {
    decorators: ['transaction'],
    params: [
      { name: 'requestId', type: 'string' },
      { name: 'result', type: 'any' }
    ],
    returnType: 'undefined'
  }
})

// standard contract interface
exports.run = (context, options) => {
  const { msg, loadContract, getContractInfo } = context.runtime
  checkMsg(msg, METADATA)

  const contract = {
    request (path, opts) {
      getContractInfo(msg.sender, 'This function must be called from a contract.')

      let p, d
      if (path.path) {
        p = path.path
        d = path.data
      } else {
        p = path
        d = undefined
      }

      options = Object.assign({}, opts || {}, { requester: msg.sender })
      const requestData = {
        path: p,
        data: d,
        options
      }
      const requestId = crypto.randomBytes(20).toString('base64')
      this.emitEvent('OffchainDataQuery', { id: requestId })
      this.setState(requestId, requestData)

      // TODO: should we assign which provider to handle?
    },

    getRequest (requestId) {
      const requestData = this.getState(requestId)
      return _.cloneDeep(requestData)
    },

    setResult (requestId, result) {
      // TODO: check provider registered
      // TODO: check provider conditions
      // TODO: sanitize result

      const requestData = this.getState(requestId)
      if (!requestData) {
        throw new Error(`Request ${requestId} no longer exists.`)
      }

      const contract = loadContract(requestData.options.requester)
      // invokeUpdate or invokeView/invokePure should be configurable
      const r = contract.onOffchainData.invokeUpdate(result)
      this.deleteState(requestId)
      return r
    }
  }

  if (!contract.hasOwnProperty(msg.name)) {
    return METADATA
  } else {
    return contract[msg.name].apply(context, msg.params)
  }
}
