const { types } = require('util')

exports.BaseSerializer = class BaseSerializer {
  serialize (o) {
    throw new Error('Not implemented.')
  }

  deserializer (o) {
    throw new Error('Not implemented.')
  }

  sanitize (o) {
    try {
      this.serialize(o)
    } catch (err) {
      throw new Error(`State object is not serializable: ${String(err)}`)
    }

    return this.detect(o, new Set())
  }

  getUnsupportedTypes () {
    return []
  }

  selfValidate (o) {
    const t = Object.prototype.toString.call(o).split(' ')[1].slice(0, -1)
    if (this.getUnsupportedTypes().includes(t) || types.isProxy(o)) {
      throw new Error(`State contains unsupported type: ${types.isProxy(o) ? 'Proxy' : t}`)
    }
  }

  detect (o, seenSet) {
    if (o == null) return null
    if (Buffer.isBuffer(o)) return o
    const t = typeof o

    this.selfValidator(o)

    if (t === 'object') {
      const propNames = Object.getOwnPropertyNames(o)
      for (const name of propNames) {
        const value = o[name]
        if (seenSet.has(value)) {
          continue
        }
        seenSet.add(value)
        if (typeof value === 'undefined') {
          delete o[name]
        } else {
          o[name] = this.detect(value, seenSet)
        }
      }
    }

    return o
  }
}

exports.getSerializer = (name = 'msgpack') => {
  return require(`./${name}`)
}
