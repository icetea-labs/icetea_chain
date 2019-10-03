const msgpack = require('msgpack-lite')
const { BaseSerializer } = require('.')

class MsgPackSerializer extends BaseSerializer {
  serialize (o) {
    return msgpack.encode(o)
  }

  deserialize (o) {
    return msgpack.decode(o)
  }

  supportCircularRef () {
    return false
  }

  getUnsupportedTypes () {
    return ['Function', 'Symbol', 'Map', 'Set', 'WeakMap']
  }
}

module.exports = new MsgPackSerializer()
