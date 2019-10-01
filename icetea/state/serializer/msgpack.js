const msgpack = require('msgpack-lite')
const { BaseSerializer } = require('./base')

class MsgPackSerializer extends BaseSerializer {
  serialize (o) {
    return msgpack.encode(o)
  }

  deserializer (o) {
    return msgpack.decode(o)
  }

  getUnsupportedTypes () {
    return ['Function', 'Symbol', 'Map', 'Set', 'WeakMap']
  }
}

module.exports = new MsgPackSerializer()
