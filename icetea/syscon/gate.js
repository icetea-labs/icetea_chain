/**
 * An MVP implementation of gate contract.
 */

const { checkMsg } = require('../helper/types')
const { gate: config } = require('../config')
const _ = require('lodash')

const PROVIDERS_KEY = 'prividers'
const _getProviders = c => c.getState(PROVIDERS_KEY, {})
const _saveProviders = (c, p) => c.setState(PROVIDERS_KEY, p)

const METADATA = Object.freeze({
  registerProvider: {
    decorators: ['payable'],
    params: [
      { name: 'providerId', type: 'string' },
      { name: 'options', type: ['object', 'undefined'] }
    ],
    returnType: 'undefined'
  },
  changeProviderOptions: {
    decorators: ['transaction'],
    params: [
      { name: 'providerId', type: 'string' },
      { name: 'options', type: 'object' }
    ],
    returnType: 'undefined'
  },
  unregisterProvider: {
    decorators: ['transaction'],
    params: [],
    returnType: 'undefined'
  },
  isProviderRegistered: {
    decorators: ['view'],
    params: [
      { name: 'provider', type: 'address' }
    ],
    returnType: 'boolean'
  },
  request: {
    decorators: ['transaction'],
    params: [
      { name: 'path', type: ['string', 'object'] },
      { name: 'options', type: ['object', 'undefined'] }
    ],
    returnType: 'string'
  },
  getRequest: {
    decorators: ['view'],
    params: [
      { name: 'requestId', type: 'string' }
    ],
    returnType: 'any'
  },
  setResult: {
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
  const msgParams = checkMsg(msg, METADATA, { sysContracts: this.systemContracts() })

  const contract = {
    registerProvider (providerId, options = {}) {
      if (msg.value < config.minProviderDeposit) {
        throw new Error(`Gate Provider must deposit at least ${config.minProviderDeposit}.`)
      }

      if (!config.providerIdRegEx.test(providerId)) {
        throw new Error('ProviderId must contain only word character (A-Za-z0-9), cannot start with a digit, and have appropriate length.')
      }

      const providers = _getProviders(context)
      if (Object.prototype.hasOwnProperty.call(providers, providerId)) {
        throw new Error(`Provider ${providerId} already exists.`)
      }

      const p = {
        deposit: msg.value,
        operator: msg.sender
      }

      if (options.awardAddress) {
        // TODO: validate address
        p.awardAddress = options.awardAddress
      }

      if (options.encryptionPubKey) {
        // TODO: valoidate pubkey
        p.encryptionPubKey = options.encryptionPubKey
      }

      if (options.topics) {
        // TODO: valoidate topics
        p.encryptionPubKey = options.topics
      }

      _saveProviders(context, p)
    },

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

      const numKey = msg.sender + '_c'
      const lastNum = this.getState(numKey, -1)
      const currentNum = lastNum + 1
      const requestId = msg.sender + '_' + currentNum

      this.setState(numKey, currentNum)
      this.setState(requestId, requestData)

      this.emitEvent('OffchainDataQuery', {
        id: requestId,
        path: p
      }, ['path']) // index path so provider could filter the path they support

      // TODO: should we assign which provider to handle?

      return requestId
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
      const r = contract.onOffchainData.invokeUpdate(requestId, requestData, result)
      this.deleteState(requestId)
      return r
    }
  }

  if (!Object.prototype.hasOwnProperty.call(contract, msg.name)) {
    return METADATA
  } else {
    return contract[msg.name].apply(context, msgParams)
  }
}
