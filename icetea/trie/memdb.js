// A simple in-memory key-value store

exports.MemDB = class {
  #_upstream
  #map = {}

  constructor (upstreamDB) {
    this.#_upstream = upstreamDB
  }

  // First search in memory, if not found, search in upstream DB
  get (key) {
    const value = this.#map[key.toString('base64')]
    if (!value) {
      return this.#_upstream.get(key)
    }
    return value
  }

  put (key, value) {
    const newValue = Buffer.allocUnsafe(value.length)
    value.copy(newValue)
    this.#map[key.toString('base64')] = newValue
  }

  dump () {
    return Object.entries(this.#map)
  }
}
