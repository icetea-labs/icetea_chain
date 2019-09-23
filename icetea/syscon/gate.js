/**
 * An MVP implementation of gate contract.
 */

const { checkMsg } = require('../helper/types')
const { gate: config } = require('../config')
const _ = require('lodash')
const utils = require('../helper/utils')

const METADATA = Object.freeze({
  registerProvider: {
    decorators: ['payable'],
    params: [
      { name: 'providerAddr', type: ['address', 'undefined'] },
      { name: 'options', type: ['object', 'undefined'] }
    ],
    returnType: 'undefined'
  },
  changeProviderOptions: {
    decorators: ['transaction'],
    params: [
      { name: 'providerAddr', type: ['address', 'undefined'] },
      { name: 'options', type: 'object' }
    ],
    returnType: 'undefined'
  },
  pauseProvider: {
    decorators: ['transaction'],
    params: [
      { name: 'providerAddr', type: ['address', 'undefined'] }
    ],
    returnType: 'undefined'
  },
  unpauseProvider: {
    decorators: ['transaction'],
    params: [
      { name: 'providerAddr', type: ['address', 'undefined'] }
    ],
    returnType: 'undefined'
  },
  unregisterProvider: {
    decorators: ['transaction'],
    params: [
      { name: 'providerAddr', type: ['address', 'undefined'] }
    ],
    returnType: 'undefined'
  },
  withdrawForProvider: {
    decorators: ['transaction'],
    params: [
      { name: 'providerAddr', type: ['address', 'undefined'] }
    ],
    returnType: 'undefined'
  },
  getProvider: {
    decorators: ['view'],
    params: [
      { name: 'providerAddr', type: ['address', 'undefined'] }
    ],
    returnType: ['object', 'undefined']
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

const PROVIDERS_KEY = 'providers'
// const TOPICS_KEY = 'topics'

const _getProviders = c => c.getState(PROVIDERS_KEY, {})
const _saveProviders = (c, ps) => c.setState(PROVIDERS_KEY, ps)

// const _getTopics = c => c.getState(TOPICS_KEY, {})
// const _saveTopics = (c, ts) => c.setState(TOPICS_KEY, ts)

// topicId: {
//  createdBy: address,
//  providers: {
//   address1: {
//     encryptionKey: pubkey
//   }
//  }
// }

const _assignOptions = (p, options) => {
  if (options.awardAddress) {
    utils.validateAddress(options.awardAddress)
    p.awardAddress = options.awardAddress
  }

  if (options.encryptionPubKey) {
    // NOTE: we only support secp256k1 uncompressed pubkey (65 bytes)
    utils.validatePublicKey(options.encryptionPubKey)
    p.encryptionPubKey = options.encryptionPubKey
  }

  // Do not support topics at the moment
  // if (options.topics) {
  //   p.encryptionPubKey = options.topics
  // }

  return p
}
const _getProviderWithCheck = (context, providerAddr, block, msg) => {
  const providers = _getProviders(context)
  const p = providers[providerAddr]
  if (!p || !p.operator) {
    throw new Error(`Invalid provider address ${providerAddr}.`)
  }

  const did = exports.systemContracts().Did
  did.checkPermission(p.operator, msg.signers, block.timestamp)

  return [p, providers]
}

const _setProviderProp = (context, providerAddr, prop, value) => {
  const [p, ps] = _getProviderWithCheck(context, providerAddr)
  p[prop] = value
  _saveProviders(context, ps)
  return p
}

// standard contract interface
exports.run = (context, options) => {
  const { msg, block, loadContract, getContractInfo } = context.runtime
  const msgParams = checkMsg(msg, METADATA, { sysContracts: this.systemContracts() })

  const contract = {
    registerProvider (providerAddr, options = {}) {
      providerAddr = providerAddr || msg.sender

      if (msg.value < config.minProviderDeposit) {
        throw new Error(`Gate Provider must deposit at least ${config.minProviderDeposit}.`)
      }

      const providers = _getProviders(context)
      if (Object.prototype.hasOwnProperty.call(providers, providerAddr)) {
        throw new Error(`Provider ${providerAddr} already exists.`)
      }

      const p = _assignOptions({
        deposit: msg.value,
        operator: msg.sender
      }, options)
      providers[providerAddr] = p
      _saveProviders(context, providers)

      context.emitEvent('ProviderRegistered', { providerAddress: providerAddr, ...p })
    },

    getProvider (providerAddr) {
      const providers = _getProviders(context)
      const p = providers[providerAddr]
      if (typeof p === 'object') {
        return _.cloneDeep(p)
      }

      return p
    },

    changeProviderOptions (providerAddr, options) {
      providerAddr = providerAddr || msg.sender
      const [p, ps] = _getProviderWithCheck(context, providerAddr, block, msg)
      _assignOptions(p, options)
      _saveProviders(context, ps)
      context.emitEvent('ProviderOptionsChanged', { providerAddress: providerAddr, ...p })
    },

    pauseProvider (providerAddr) {
      providerAddr = providerAddr || msg.sender
      const p = _setProviderProp(context, providerAddr, 'paused', block.number)
      context.emitEvent('ProviderPaused', { providerAddress: providerAddr, ...p })
    },

    unpauseProvider (providerAddr) {
      providerAddr = providerAddr || msg.sender
      const [p, ps] = _getProviderWithCheck(context, providerAddr, block, msg)

      if (!p.paused) {
        throw new Error('Provider is not paused.')
      }

      delete p.paused
      _saveProviders(context, ps)

      context.emitEvent('ProviderUnpaused', { providerAddress: providerAddr, ...p })
    },

    unregisterProvider (providerAddr) {
      providerAddr = providerAddr || msg.sender
      const p = _setProviderProp(context, providerAddr, 'unregistered', block.number)
      context.emitEvent('ProviderUnregistered', p)
    },

    withdrawForProvider (providerAddr, receivingAddr) {
      providerAddr = providerAddr || msg.sender
      const [p, providers] = _getProviderWithCheck(context, providerAddr, block, msg)

      if (!p.unregistered) {
        throw new Error('You must unregister the provider first.')
      }

      const waitTill = p.unregistered + config.unregistrationLock
      if (waitTill < block.number) {
        throw new Error(`Please wait to block ${waitTill} to withdraw, current block is ${block.number}.`)
      }

      const rAddr = receivingAddr || msg.sender
      this.transfer(rAddr)
      delete providers[providerAddr]
      _saveProviders(context, providers)

      context.emitEvent('ProviderWithdrawn', {
        providerAddress: providerAddr,
        receivingAddress: rAddr,
        ...p
      })
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
      const providers = _getProviders(context)
      if (!Object.prototype.hasOwnProperty.call(providers, msg.sender)) {
        throw new Error(`Provider not registered: ${msg.sender}.`)
      }

      // TODO: check provider conditions/topics
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
