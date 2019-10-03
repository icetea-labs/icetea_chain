const v8 = require('v8')
const { BaseSerializer } = require('.')

class V8Serializer extends BaseSerializer {
  serialize (o) {
    return v8.serialize(o)
  }

  deserialize (o) {
    return v8.deserialize(o)
  }

  getUnsupportedTypes () {
    return ['Function', 'Symbol', 'WeakMap']
  }
}

module.exports = new V8Serializer()
