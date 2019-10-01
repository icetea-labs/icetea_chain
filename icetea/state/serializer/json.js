const { BaseSerializer } = require('./base')

class JsonSerializer extends BaseSerializer {
  serialize (o) {
    if (typeof o === 'undefined') return Buffer.alloc(0)
    return Buffer.from(JSON.stringify(o) || '')
  }

  deserializer (o) {
    if (!o) return o
    if (Buffer.isBuffer(o) && o.length === 0) {
      return undefined
    }
    return JSON.parse(o.toString())
  }

  getUnsupportedTypes () {
    return ['Function', 'Symbol', 'Map', 'Set', 'WeakMap', 'Date', 'RegExp']
  }
}

module.exports = new JsonSerializer()
