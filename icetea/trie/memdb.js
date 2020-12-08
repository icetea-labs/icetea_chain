// A simple in-memory key-value store

exports.MemDB = class {
  #_upstream
  #map = {}

  constructor (upstreamDB) {
    this._upstream = upstreamDB
  }

  get (key) {
    return this.#map[key.toString('base64')]
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
