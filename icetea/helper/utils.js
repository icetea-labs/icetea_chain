const _ = require('lodash')

exports.prepareState = (addr, stateTable, initialValues) => {
  if (!stateTable[addr]) {
    stateTable[addr] = {}
  }

  if (typeof stateTable[addr].balance === 'undefined') {
    let balance = 0

    Object.defineProperty(stateTable[addr], 'balance', {
      enumerable: true,
      get () {
        return balance
      },
      set (value) {
        if (value < 0) {
          throw new Error('Balance cannot be negative')
        }
        balance = value
      }
    })
  }

  if (initialValues) {
    Object.assign(stateTable[addr], initialValues)
  }

  return stateTable[addr]
}

exports.balanceOf = (addr, stateTable) => {
  const state = stateTable[addr]
  if (!state) return 0

  return state.balance || 0
}

exports.incBalance = (addr, delta, stateTable) => {
  delta = parseFloat(delta) || 0
  const state = exports.prepareState(addr, stateTable)
  if (state.balance + delta < 0) {
    throw new Error('Not enough balance')
  }
  state.balance += delta
}

exports.decBalance = (addr, delta, stateTable) => {
  exports.incBalance(addr, -delta, stateTable)
}

exports.getAllPropertyNames = function (obj) {
  var props = []
  if (!obj) return props

  do {
    Object.getOwnPropertyNames(obj).forEach(prop => {
      if (!props.includes(prop)) {
        props.push(prop)
      }
    })
  } while ((obj = Object.getPrototypeOf(obj)) && obj !== Object.prototype)

  // console.log(props);
  return props
}

exports.emitEvent = function (emitter, tags, eventName, eventData, indexes = []) {
  emitter = emitter || 'system'
  tags = tags || {}

  if (eventName === 'EventNames' || eventName === 'tx') {
    throw new Error("Event name cannot be 'EventNames' or 'tx'")
  }
  if (eventName.includes('|')) {
    throw new Error("Event name cannot contain '|' character")
  }
  if (!tags.EventNames) tags.EventNames = '|'
  if (tags.EventNames.includes('|' + eventName + '|')) {
    throw new Error('Event ' + eventName + ' was already emit')
  }
  tags.EventNames += emitter + '.' + eventName + '|'
  indexes.forEach(indexedKey => {
    if (typeof indexedKey !== 'string') {
      throw new Error("Event's indexed key must be string")
    }
    // if (typeof eventData[indexedKey] === "undefined") {
    //    throw new Error("Event's indexed value is not provided");
    // }
    tags[eventName + '.' + indexedKey] = String(JSON.stringify(eventData[indexedKey]))
    delete eventData[indexedKey]
  })
  tags[eventName] = String(JSON.stringify(eventData))

  return tags
}

exports.emitTransferred = (emitter, tags, from, to, value) => {
  return exports.emitEvent(emitter, tags, 'Transferred', { from, to, value }, ['from', 'to'])
}

exports.mergeStateTables = (t1, t2) => {
  Object.keys(t2).forEach(addr => {
    let account1 = t1[addr]
    const account2 = t2[addr]

    if (account2) {
      if (!account1) {
        account1 = t1[addr] = {}
      }

      if (typeof account2.balance !== 'undefined') {
        account1.balance = account2.balance
      }

      if (account2.state) {
        if (!account1.state) {
          account1.state = {}
        }
        _.merge(account1.state, account2.state)
      }

      Object.keys(account2).forEach(key => {
        if (typeof account1[key] === 'undefined') {
          account1[key] = account2[key]
        }
      })
    }
  })
  return t1
}

exports.unifyMetadata = meta => {
  const DEF_PROPS = {
    address: {
      type: 'ClassProperty',
      decorators: ['view'],
      returnType: 'string'
    },
    balance: {
      type: 'ClassProperty',
      decorators: ['view'],
      returnType: 'number'
    }
  }

  if (!meta) {
    return DEF_PROPS
  }

  if (typeof meta === 'string') {
    meta = meta.split(';')
  }

  if (Array.isArray(meta)) {
    meta = meta.reduce((prev, current) => {
      prev[current] = {
        type: 'unknown'
      }
      return prev
    }, {})
  }

  const excepts = ['constructor', '__on_deployed', '__on_received', 'getEnv', 'getState', 'setState']
  Object.keys(meta).forEach(k => {
    if (excepts.includes(k)) {
      delete meta[k]
    }
  })

  return Object.assign(meta, DEF_PROPS)
}
