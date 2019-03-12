const { switchEncoding, encodeTX, decodeTX, tryParseJson } = require('../../tweb3/utils')

class BaseProvider {

  // constructor (endpoint) {
  //   this.endpoint = endpoint
  // }

  decodeTags (tx, keepEvents = false) {
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

  decodeTxResult (result) {
    if (!result) return result
    const name = result.tx_result ? 'tx_result' : 'deliver_tx'
  
    if (result[name] && result[name].data) {
      result[name].data = tryParseJson(switchEncoding(result[name].data, 'base64', 'utf8'))
    }
  
    return result
  }
  
  decodeEventData (tx) {
    const EMPTY_RESULT = []
  
    const tags = this.decodeTags(tx, true)
  
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

  sanitizeParams (params) {
    params = params || {}
    Object.keys(params).forEach(k => {
      let v = params[k]
      if (typeof v === 'number') {
        params[k] = String(v)
      }
    })
    return params
  }

  _call(method, params) {}
  
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

module.exports = BaseProvider