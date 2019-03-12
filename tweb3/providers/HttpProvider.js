const BaseProvider = require('./BaseProvider')
const fetch = require('node-fetch')

class HttpProvider extends BaseProvider {
  constructor (endpoint) {
    super()
    this.endpoint = endpoint
  }

  _call (method, params) {
    const json = {
      jsonrpc: '2.0',
      id: Date.now(),
      method,
      params: this.sanitizeParams(params)
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

  sanitizeParams (params) {
    return super.sanitizeParams(params)
  }
}

module.exports = HttpProvider
