const { TxOp, ContractMode } = require('../icetea/enum')
const { signTxData } = require('./helper/ecc')
const ecc = require('./helper/ecc')
const { switchEncoding, decodeTX } = require('./utils')
// const W3CWebSocket = require('websocket').w3cwebsocket
// const WebSocketAsPromised = require('websocket-as-promised')
const Contract = require('./contract/Contract')
const HttpProvider = require('./providers/HttpProvider')
const WebSocketProvider = require('./providers/WebSocketProvider')

/**
 * The IceTea web client.
 */
exports.IceTeaWeb3 = class IceTeaWeb3 {
  /**
   * Initialize the IceTeaWeb3 instance.
   * @param {string} endpoint tendermint endpoint, e.g. http://localhost:26657
   */
  constructor (endpoint, options) {
    this.isWebSocket = !!(endpoint.startsWith('ws://') || endpoint.startsWith('wss://'))
    if (this.isWebSocket) {
      this.rpc = new WebSocketProvider(endpoint, options)
    } else {
      this.rpc = new HttpProvider(endpoint)
    }

    this.utils = {
      decodeEventData: this.rpc.decodeEventData,
      decodeTags: this.rpc.decodeTags,
      decodeTxResult: this.rpc.decodeTxResult
    }
    this.subscriptions = {}
    this.countSubscribeEvent = 0
  }

  close () {
    if (this.isWebSocket) {
      this.rpc.close()
    }
  }

  /**
   * Get account balance.
   * @param {string} address address of the account.
   * @returns {number} account balance.
   */
  getBalance (address) {
    return this.rpc.query('balance', address)
  }

  /**
   * Get a single block.
   * @param {*} options example {height: 10}, skip to get latest block.
   * @returns the tendermint block.
   */
  getBlock (options) {
    return this.rpc.call('block', options)
  }

  /**
   * Get a list of blocks.
   * @param {*} options optional, e.g. {minHeight: 0, maxHeight: 10}
   * @returns {Array} an array of tendermint blocks
   */
  getBlocks (options) {
    return this.rpc.call('blockchain', options)
  }

  /**
   * Get a single transaction.
   * @param {string} hash required, hex string without '0x'.
   * @param {*} options optional, e.g. {prove: true} to request proof.
   * @return {*} the tendermint transaction.
   */
  getTransaction (hash, options) {
    if (!hash) {
      throw new Error('hash is required')
    }
    return this.rpc.call('tx', { hash: switchEncoding(hash, 'hex', 'base64'), ...options })
      .then(this.rpc.decodeTxResult)
  }

  /**
   * Search for transactions met the query specified.
   * @param {string} query required, query based on tendermint indexed tags, e.g. "tx.height>0".
   * @param {*} options additional options, e.g. {prove: true, page: 2, per_page: 20}
   * @returns {Array} Array of tendermint transactions.
   */
  searchTransactions (query, options) {
    if (!query) {
      throw new Error('query is required, example "tx.height>0"')
    }
    return this.rpc.call('tx_search', { query, ...options })
  }

  /**
   * Search for events emit by contracts.
   * @param {string} eventName the event name, e.g. "Transferred"
   * @param {string} emitter optional, the contract address, or "system"
   * @param {*} conditions required, string or object literal.
   * string example: "tx.height>0 AND someIndexedField CONTAINS 'kkk'".
   * Object example: {fromBlock: 0, toBlock: 100, someIndexedField: "xxx"}.
   * Note that conditions are combined using AND, no support for OR.
   * @param {*} options additional options, e.g. {prove: true, page: 2, per_page: 20}
   * @returns {Array} Array of tendermint transactions containing the event.
   */
  getPastEvents (eventName, emitter, conditions = {}, options) {
    let query = ''
    if (typeof conditions === 'string') {
      query = conditions
    } else {
      if (!emitter) {
        emitter = '.'
      } else {
        emitter = '|' + emitter + '.'
      }
      query = Object.keys(conditions).reduce((arr, key) => {
        const value = conditions[key]
        if (key === 'fromBlock') {
          arr.push(`tx.height>${value - 1}`)
        } else if (key === 'toBlock') {
          arr.push(`tx.height<${value + 1}`)
        } else {
          arr.push(`${key}=${value}`)
        }
        return arr
      }, [`EventNames CONTAINS '${emitter}${eventName}|'`]).join(' AND ')
    }

    return this.searchTransactions(query, options)
  }

  /**
   * @return {string[]} Get all deployed smart contracts.
   */
  getContracts () {
    return this.rpc.query('contracts')
  }

  /**
   * Get contract metadata.
   * @param {string} contractAddr the contract address.
   * @returns {string[]} methods and fields array.
   */
  getMetadata (contractAddr) {
    return this.rpc.query('metadata', contractAddr)
  }

  /**
   * @private
   */
  getDebugState () {
    return this.rpc.query('state')
  }

  /**
   * Send a transaction and return immediately.
   * @param {{from: string, to: string, value: number, fee: number, data: Object}} tx the transaction object.
   * @param {string} privateKey private key used to sign
   */
  sendTransactionAsync (tx, privateKey) {
    return this.rpc.send('broadcast_tx_async', signTxData(tx, privateKey))
  }

  /**
   * Send a transaction and wait until it reach mempool.
   * @param {{from: string, to: string, value: number, fee: number, data: Object}} tx the transaction object.
   * @param {string} privateKey private key used to sign
   */
  sendTransactionSync (tx, privateKey) {
    return this.rpc.send('broadcast_tx_sync', signTxData(tx, privateKey))
  }

  /**
   * Send a transaction and wait until it is included in a block.
   * @param {{from: string, to: string, value: number, fee: number, data: Object}} tx the transaction object.
   * @param {string} privateKey private key used to sign
   */
  sendTransactionCommit (tx, privateKey) {
    return this.rpc.send('broadcast_tx_commit', signTxData(tx, privateKey))
      .then(this.rpc.decodeTxResult)
  }

  /**
   * Call a readonly (@view) contract method or field.
   * @param {string} contract required, the contract address.
   * @param {string} method required, method or field name.
   * @param {Array} params method params, if any.
   * @param {*} options optional options, e.g. {from: 'xxx'}
   */
  callReadonlyContractMethod (contract, method, params = [], options = {}) {
    return this.rpc.query('invokeView', { address: contract, name: method, params, options })
  }

  /**
   * Call a pure (@pure) contract method or field.
   * @param {string} contract required, the contract address.
   * @param {string} method required, method or field name.
   * @param {Array} params method params, if any.
   * @param {*} options optional options, e.g. {from: 'xxx'}
   */
  callPureContractMethod (contract, method, params = [], options = {}) {
    return this.rpc.query('invokePure', { address: contract, name: method, params, options })
  }

  // shorthand for transfer, deploy, write, read contract goes here
  /**
     * Subscribes by event (for WebSocket only)
     *
     * @method subscribe
     *
     * @param {MessageEvent} EventName
     */
  subscribe (eventName, conditions = {}, callback) {
    if (!this.isWebSocket) throw new Error('subscribe for WebSocket only')
    let systemEvent = ['NewBlock', 'NewBlockHeader', 'Tx', 'RoundState', 'NewRound', 'CompleteProposal', 'Vote', 'ValidatorSetUpdates', 'ProposalString']
    let isSystemEvent = true
    let nonSystemEventName
    let space = ''

    if (systemEvent.indexOf(eventName) < 0) {
      isSystemEvent = false
      nonSystemEventName = eventName
      this.countSubscribeEvent += 1
      eventName = 'Tx'
    }

    for (var i = 0; i < this.countSubscribeEvent; i++) {
      space = space + ' '
    }

    var query = ''
    if (typeof conditions === 'string') {
      query = conditions
    } else {
      if (typeof conditions === 'function' && typeof callback === 'undefined') {
        callback = conditions
        conditions = {}
      }
      query = Object.keys(conditions).reduce((arr, key) => {
        const value = conditions[key]
        if (key === 'fromBlock') {
          arr.push(`tx.height>${value - 1}`)
        } else if (key === 'toBlock') {
          arr.push(`tx.height<${value + 1}`)
        } else {
          arr.push(`${key}=${value}`)
        }
        return arr
      }, [`tm.event = ${space}'${eventName}'`]).join(' AND ')
    }

    return this.rpc.call('subscribe', { 'query': query }).then((result) => {
      this.subscriptions[result.id] = {
        id: result.id,
        subscribeMethod: nonSystemEventName || eventName,
        query: query
      }
      // console.log('this.subscriptions',this.subscriptions);
      this.rpc.registerEventListener('onMessage', (message) => {
        let jsonMsg = JSON.parse(message)
        if (result.id && jsonMsg.id.indexOf(result.id) >= 0) {
          if (isSystemEvent) {
            return callback(message)
          } else {
            let events = this.rpc.decodeEventData(jsonMsg.result)
            events.forEach(event => {
              if (event.eventName && nonSystemEventName === event.eventName) {
                let res = {}
                res.jsonrpc = jsonMsg.jsonrpc
                res.id = jsonMsg.id
                res.result = event
                res.result.query = this.subscriptions[result.id].query
                return callback(JSON.stringify(res), null, 2)
              }
            })
          }
        }
      })

      return result
    })
  }
  /**
   * Unsubscribes by event (for WebSocket only)
   *
   * @method unsubscribe
   *
   * @param {SubscriptionId} subscriptionId
   */
  unsubscribe (subscriptionId) {
    if (!this.isWebSocket) throw new Error('unsubscribe for WebSocket only')
    if (typeof this.subscriptions[subscriptionId] !== 'undefined') {
      return this.rpc.call('unsubscribe', { 'query': this.subscriptions[subscriptionId].query }).then((res) => {
        delete this.subscriptions[subscriptionId]
        return res
      })
    }
    return Promise.reject(new Error(`Error: Subscription with ID ${subscriptionId} does not exist.`))
  }

  onMessage (callback) {
    if (!this.isWebSocket) throw new Error('onMessage for WebSocket only')
    this.rpc.registerEventListener('onMessage', callback)
  }

  onResponse (callback) {
    if (!this.isWebSocket) throw new Error('onResponse for WebSocket only')
    this.rpc.registerEventListener('onResponse', callback)
  }

  onError (callback) {
    if (!this.isWebSocket) throw new Error('onError for WebSocket only')
    this.rpc.registerEventListener('onError', callback)
  }

  onClose (callback) {
    if (!this.isWebSocket) throw new Error('onClose for WebSocket only')
    this.rpc.registerEventListener('onClose', callback)
  }

  contract (address, privateKey) {
    return new Contract(this, address, privateKey)
  }

  async deploy (mode, src, privateKey, params = [], options = {}) {
    let tx = this._serializeData(mode, src, privateKey, params, options)
    let res = await this.sendTransactionCommit(tx, privateKey)
    return this.getTransaction(res.hash).then(result => {
      if (result.tx_result.code) {
        const err = new Error(result.tx_result.log)
        Object.assign(err, result)
        throw err
      }
      const data = decodeTX(result.tx)
      // console.log("data1",data);
      return {
        hash: result.hash,
        height: result.height,
        address: result.tx_result.data,
        data: {
          from: data.from,
          to: result.tx_result.data,
          value: data.value,
          fee: data.fee
        }
      }
    })
  }

  _serializeData (mode, src, privateKey, params, options) {
    var formData = {}
    var txData = {
      op: TxOp.DEPLOY_CONTRACT,
      mode: mode,
      params: params
    }
    if (mode === ContractMode.JS_DECORATED || mode === ContractMode.JS_RAW) {
      txData.src = switchEncoding(src, 'utf8', 'base64')
    } else {
      txData.src = src
    }
    formData.from = ecc.toPublicKey(privateKey)
    formData.value = options.value || 0
    formData.fee = options.fee || 0
    formData.data = txData
    return formData
  }
}
