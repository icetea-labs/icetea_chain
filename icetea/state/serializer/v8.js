const v8 = require('v8')
const { BaseSerializer } = require('./base')

class V8Serializer extends BaseSerializer {
  serialize (o) {
    return v8.serialize(o)
  }

  deserializer (o) {
    return v8.deserialize(o)
  }

  getUnsupportedTypes () {
    return ['Function', 'Symbol', 'Map', 'Set', 'WeakMap']
  }
}

module.exports = new V8Serializer()
