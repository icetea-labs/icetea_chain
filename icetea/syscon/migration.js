const canMerge = (o, n) => {
  if (o == null || typeof o !== 'object') return false
  if (n == null || typeof n !== 'object') return false
  return true
}

const merge = (o, n) => {
  if (!canMerge(o, n)) {
    return n
  }

  // we support shallow merge only
  return Object.assign({}, o, n)
}

const expectOwner = context => {
  if (context.runtime.msg.sender !== process.env.MIGRATE_ADDRESS) {
    throw new Error('Permission denied.')
  }
}

module.exports = () => {
  function setContextMigration (context) {
    this.context = context
  }

  function exportState () {
    expectOwner(this.context)
    const resp = this.context.getStateKeys().reduce((data, key) => {
      data[key] = this.context.getState(key)
      return data
    }, {})

    return JSON.stringify(resp)
  }

  function importState (data, overwrite) {
    expectOwner(this.context)
    let count = 0
    Object.entries(data).forEach(([key, value]) => {
      count++
      if (overwrite) {
        this.context.setState(key, value)
      } else {
        const old = this.context.getState(key)
        this.context.setState(key, merge(old, value))
      }
    })
    return count
  }

  return { setContextMigration, exportState, importState }
}
