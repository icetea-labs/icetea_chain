const fetch = require('node-fetch')
const { TxOp, ContractMode } = require('../icetea/enum')
const { signTxData } = require('../icetea/helper/ecc')
const ecc = require('../icetea/helper/ecc')
const { switchEncoding, encodeTX, decodeTX, tryParseJson } = require('../tweb3/utils')
const W3CWebSocket = require('websocket').w3cwebsocket
const WebSocketAsPromised = require('websocket-as-promised')
const Contract = require('./Contract')

function decodeTags (tx, keepEvents = false) {
  const EMPTY_RESULT = {}
  let b64Tags = tx

  if (tx.data && tx.data.value && tx.data.value.TxResult.result.tags) {
    b64Tags = tx.data.value.TxResult.result.tags // For subscribe
  } else if (tx.tx_result && tx.tx_result.tags) {
    b64Tags = tx.tx_result.tags
  } else if (tx.deliver_tx && tx.deliver_tx.tags) {
    b64Tags = tx.deliver_tx.tags
  }
  if (!b64Tags.length) {
    return EMPTY_RESULT
  }

  const tags = {}
  // decode tags
  b64Tags.forEach(t => {
    const key = switchEncoding(t.key, 'base64', 'utf8')
    const value = switchEncoding(t.value, 'base64', 'utf8')
    tags[key] = tryParseJson(value)
  })

  if (!keepEvents && tags.EventNames) {
    // remove event-related tags
    const events = tags.EventNames.split('|')
    events.forEach(e => {
      if (e) {
        const eventName = e.split('.')[1]
        Object.keys(tags).forEach(key => {
          if (key.indexOf(eventName) === 0) {
            delete tags[key]
          }
        })
        delete tags[e]
      }
    })
    delete tags.EventNames
  }

  return tags
}

function decodeEventData (tx) {
  const EMPTY_RESULT = []

  const tags = decodeTags(tx, true)

  if (!tags.EventNames) {
    return EMPTY_RESULT
  }

  const events = tags.EventNames.split('|')
  if (!events.length) {
    return EMPTY_RESULT
  }

  const result = events.reduce((r, e) => {
    if (e) {
      const parts = e.split('.')
      const emitter = parts[0]
      const eventName = parts[1]
      const eventData = Object.keys(tags).reduce((data, key) => {
        const prefix = eventName + '.'
        if (key.startsWith(prefix)) {
          const name = key.substr(prefix.length)
          const value = tags[key]
          data[name] = value
        } else if (key === eventName) {
          Object.assign(data, tags[key])
        }
        return data
      }, {})
      r.push({ emitter, eventName, eventData })
    }
    return r
  }, [])

  return result
}

function decodeTxResult (result) {
  if (!result) return result
  const name = result.tx_result ? 'tx_result' : 'deliver_tx'

  if (result[name] && result[name].data) {
    result[name].data = tryParseJson(switchEncoding(result[name].data, 'base64', 'utf8'))
  }

  return result
}

function sanitizeParams (params) {
  params = params || {}
  Object.keys(params).forEach(k => {
    let v = params[k]
    if (typeof v === 'number') {
      params[k] = String(v)
    }
  })
  return params
}

exports.Utils = {
  decodeEventData,
  decodeTags,
  decodeTxResult
}

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

    this.utils = this.constructor.utils = exports.Utils
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
      .then(decodeTxResult)
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
   * Get account info.
   * @param {string} contractAddr  the contract address.
   * @returns {{balance: number, code: string | Buffer, mode: number, deployedBy: string, system: boolean}} Contract metadata.
   */
  getAccountInfo (contractAddr) {
    return this.rpc.query('account_info', contractAddr)
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
      .then(decodeTxResult)
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
            let events = this.utils.decodeEventData(jsonMsg.result)
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

  async deploy (mode, src, privateKey) {
    let tx = this._serializeData(mode, src, privateKey)
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

  _serializeData (mode, src, privateKey, params = [], options = {}) {
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

class WebSocketProvider {
  constructor (endpoint, options) {
    // this.endpoint = "ws://localhost:26657/websocket"
    this.endpoint = endpoint
    this.options = options || {
      createWebSocket: url => new W3CWebSocket(url),
      packMessage: data => JSON.stringify(data),
      unpackMessage: message => JSON.parse(message),
      attachRequestId: (data, requestId) => Object.assign({ id: requestId }, data),
      extractRequestId: data => data.id
      // timeout: 10000,
    }
    this.wsp = new WebSocketAsPromised(this.endpoint, this.options)
  }

  close () {
    this.wsp.close()
  }

  registerEventListener (event, callback) {
    this.wsp[event].addListener(callback)
  }

  async _call (method, params) {
    const json = {
      jsonrpc: '2.0',
      method,
      params: sanitizeParams(params)
    }

    if (!this.wsp.isOpened) {
      await this.wsp.open()
    }

    return this.wsp.sendRequest(json)
  }

  call (method, params) {
    // console.log('method ',method, '| params: ',params);
    return this._call(method, params).then(resp => {
      if (resp.error) {
        const err = new Error(resp.error.message)
        Object.assign(err, resp.error)
        throw err
      }
      if (resp.id) resp.result.id = resp.id

      return resp.result
    })
  }

  // query application state (read)
  query (path, data, options) {
    const params = { path, ...options }
    if (data) {
      if (typeof data !== 'string') {
        data = JSON.stringify(data)
      }
      params.data = switchEncoding(data, 'utf8', 'hex')
    }

    return this._call('abci_query', params).then(resp => {
      if (resp.error) {
        const err = new Error(resp.error.message)
        Object.assign(err, resp.error)
        throw err
      }

      // decode query data embeded in info
      let r = resp.result
      if (r && r.response && r.response.info) {
        r = tryParseJson(r.response.info)
      }

      return r
    })
  }

  // send a transaction (write)
  send (method, tx) {
    return this.call(method, {
      // for jsonrpc, encode in 'base64'
      // for query string (REST), encode in 'hex' (or 'utf8' inside quotes)
      tx: encodeTX(tx, 'base64')
    }).then(result => {
      if (result.code) {
        const err = new Error(result.log)
        Object.assign(err, result)
        throw err
      }

      return result
    })
  }
}

class HttpProvider {
  constructor (endpoint) {
    this.endpoint = endpoint
  }

  _call (method, params) {
    const json = {
      jsonrpc: '2.0',
      id: Date.now(),
      method,
      params: sanitizeParams(params)
    }

    return fetch(this.endpoint, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json; charset=utf-8'
      },
      body: JSON.stringify(json)
    })
      .then(resp => resp.json())
  }

  // call a jsonrpc, normally to query blockchain (block, tx, validator, consensus, etc.) data
  call (method, params) {
    return this._call(method, params).then(resp => {
      if (resp.error) {
        const err = new Error(resp.error.message)
        Object.assign(err, resp.error)
        throw err
      }
      if (resp.id) resp.result.id = resp.id
      return resp.result
    })
  }

  // query application state (read)
  query (path, data, options) {
    const params = { path, ...options }
    if (data) {
      if (typeof data !== 'string') {
        data = JSON.stringify(data)
      }
      params.data = switchEncoding(data, 'utf8', 'hex')
    }

    return this._call('abci_query', params).then(resp => {
      if (resp.error) {
        const err = new Error(resp.error.message)
        Object.assign(err, resp.error)
        throw err
      }

      // decode query data embeded in info
      let r = resp.result
      if (r && r.response && r.response.info) {
        r = tryParseJson(r.response.info)
      }
      return r
    })
  }

  // send a transaction (write)
  send (method, tx) {
    return this.call(method, {
      // for jsonrpc, encode in 'base64'
      // for query string (REST), encode in 'hex' (or 'utf8' inside quotes)
      tx: encodeTX(tx, 'base64')
    }).then(result => {
      if (result.code) {
        const err = new Error(result.log)
        Object.assign(err, result)
        throw err
      }

      return result
    })
  }
}
