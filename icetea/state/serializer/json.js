const { BaseSerializer } = require('.')

// NOTE: this class is here just for performance and size comparation
// It is NOT suitable to use JSON-based state serialization due to many JSON limitations

class JsonSerializer extends BaseSerializer {
  serialize (o) {
    if (typeof o === 'undefined') return Buffer.alloc(0)
    return Buffer.from(JSON.stringify(o) || '')
  }

  deserialize (o) {
    if (!o) return o
    if (Buffer.isBuffer(o) && o.length === 0) {
      return undefined
    }
    return JSON.parse(o.toString())
  }

  supportCircularRef () {
    return false
  }

  getUnsupportedTypes () {
    return ['Function', 'Symbol', 'Map', 'Set', 'WeakMap', 'Date', 'RegExp']
  }
}

module.exports = new JsonSerializer()
