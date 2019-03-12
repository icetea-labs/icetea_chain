const BaseProvider = require("./BaseProvider")
const W3CWebSocket = require('websocket').w3cwebsocket
const WebSocketAsPromised = require('websocket-as-promised')

class WebSocketProvider extends BaseProvider {
    constructor (endpoint, options) {
        super();
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
          params: this.sanitizeParams(params)
        }
    
        if (!this.wsp.isOpened) {
          await this.wsp.open()
        }
    
        return this.wsp.sendRequest(json)
      }

      sanitizeParams(params) {
        return super.sanitizeParams(params);
      }
}

module.exports = WebSocketProvider