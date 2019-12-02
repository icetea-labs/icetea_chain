// A simple in-memory key-value store

exports.MemDB = class {
    #map = new Map()

    get (key) {
      return this.#map.get(key)
    }

    put (key, value) {
      return this.#map.set(key, value)
    }
}
