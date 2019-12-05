// A simple in-memory key-value store

exports.MemDB = class {
    #map = {}

    get (key) {
      return this.#map[key.toString('base64')]
    }

    put (key, value) {
      const newValue = Buffer.allocUnsafe(value.length)
      value.copy(newValue)
      this.#map[key.toString('base64')] = newValue
    }

    dump () {
      console.log('dump')
      const entries = Object.entries(this.#map)
      entries.forEach(([key, value]) => {
        console.log(Buffer.from(key, 'base64'), value)
      })
      console.log(entries.length)
    }
}
