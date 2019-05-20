/** @module */

const _ = require('lodash')

/**
 * get all property name of an object
 * @function
 * @param {object} object - object
 * @returns {Array.<string>} property names
 */
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

/**
 * emit events
 * @function
 * @param {object} emitter - emmitter
 * @param {Array.<string>} tags - event tag
 * @param {string} eventName - event name
 * @param {object} eventData - event data
 * @param {Array.<string>} [indexes=[]] - index key in event data
 * @returns {Array.<string>} tags
 */
exports.emitEvent = function (emitter, tags, eventName, eventData, indexes = []) {
  const EVENTNAMES_SEP = '|'
  const EMITTER_EVENTNAME_SEP = '%'
  const EVENTNAME_INDEX_SEP = '~'

  emitter = emitter || 'system'
  tags = tags || {}

  if (typeof eventData !== 'object') {
    throw new Error('eventData must be an object.')
  }
  if (eventName === 'EventNames' || eventName === 'tx') {
    throw new Error("Event name cannot be 'EventNames' or 'tx'")
  }
  if (eventName.includes(EVENTNAMES_SEP) || eventName.includes(EMITTER_EVENTNAME_SEP) || eventName.includes(EVENTNAME_INDEX_SEP)) {
    throw new Error(`Event name cannot contain ${EVENTNAMES_SEP}, ${EMITTER_EVENTNAME_SEP}, or ${EVENTNAME_INDEX_SEP} characters.`)
  }

  if (!tags.EventNames) tags.EventNames = EVENTNAMES_SEP
  if (tags.EventNames.includes(EVENTNAMES_SEP + eventName + EVENTNAMES_SEP)) {
    throw new Error('Event ' + eventName + ' was already emit')
  }
  tags.EventNames += emitter + EMITTER_EVENTNAME_SEP + eventName + EVENTNAMES_SEP
  indexes.forEach(indexedKey => {
    if (typeof indexedKey !== 'string') {
      throw new Error("Event's indexed key must be string")
    }
    // if (typeof eventData[indexedKey] === "undefined") {
    //    throw new Error("Event's indexed value is not provided");
    // }
    tags[eventName + EVENTNAME_INDEX_SEP + indexedKey] = String(JSON.stringify(eventData[indexedKey]))
    delete eventData[indexedKey]
  })
  tags[eventName] = String(exports.serialize(eventData))

  return tags
}

/**
 * emit transfered events
 * @function
 * @param {object} emitter - emmitter
 * @param {Array.<string>} tags - event tag
 * @param {string} from - from address
 * @param {string} to - to address
 * @param {string} payer - the one who pays the transaction
 * @param {number} value - transfer value
 * @returns {Array.<string>} tags
 */
exports.emitTransferred = (emitter, tags, from, to, payer, value) => {
  return exports.emitEvent(emitter, tags, 'Transferred', { from, to, payer, value }, ['from', 'to', 'payer'])
}

/**
 * merge blockchain state and excuted state
 * @function
 * @param {object} t1 - first state
 * @param {object} t2 - second state
 * @returns {object} merged state
 */
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

/**
 * unify metadata
 * @function
 * @param {object} meta - metadata
 * @returns {object} unified metadata
 */
exports.unifyMetadata = meta => {
  const DEF_PROPS = {
    /*
    address: {
      type: 'ClassProperty',
      decorators: ['attribute'],
      fieldType: 'string'
    },
    balance: {
      type: 'ClassProperty',
      decorators: ['attribute'],
      fieldType: 'number'
    },
    deployedBy: {
      type: 'ClassProperty',
      decorators: ['attribute'],
      fieldType: 'number'
    }
    */
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

  const excepts = ['constructor', '__on_deployed', '__on_received', 'runtime', 'getState', 'setState']
  Object.keys(meta).forEach(k => {
    if (excepts.includes(k) || k.startsWith('#')) {
      delete meta[k]
    }
  })

  return Object.assign(meta, DEF_PROPS)
}

/**
 * create a non-editable object
 * @function
 * @param {object} object - object
 * @returns {object} freezed object
 */
// Credit: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/freeze
exports.deepFreeze = (object) => {
  // Retrieve the property names defined on object
  const propNames = Object.getOwnPropertyNames(object)

  // Freeze properties before freezing self

  for (let name of propNames) {
    let value = object[name]

    object[name] = value && typeof value === 'object'
      ? exports.deepFreeze(value) : value
  }

  return Object.freeze(object)
}

/**
 * Make obj CAN extend but CANNOT change existing props.
 * It is similar to Object.freeze but allowing adding new props.
 */
exports.fixObject = obj => {
  const props = Object.getOwnPropertyNames(obj)

  for (let i = 0; i < props.length; i++) {
    const desc = Object.getOwnPropertyDescriptor(obj, props[i])

    if ('value' in desc) {
      desc.writable = false
    }

    desc.configurable = false
    Object.defineProperty(obj, props[i], desc)
  }

  return obj
}

exports.checkUnsupportTypes = o => {
  if (o == null) return null
  if (Buffer.isBuffer(o)) return o
  const t = typeof o

  if (t === 'bigint' || t === 'function' ||
    o instanceof RegExp ||
    o instanceof Date ||
    o instanceof Map ||
    o instanceof Set ||
    o instanceof WeakMap) {
    throw new Error('State contains unsupported type.')
  }

  if (t === 'object') {
    const propNames = Object.getOwnPropertyNames(o)
    for (let name of propNames) {
      const value = o[name]
      if (typeof value === 'undefined') {
        delete o[name]
      } else {
        o[name] = exports.checkUnsupportTypes(o[name])
      }
    }
  }

  return o
}

/**
 * bind all function to original object
 * @function
 * @param {object} obj - object
 * @returns {object} bind-all object
 */
exports.bindAll = obj => {
  Object.getOwnPropertyNames(obj).forEach(p => {
    if (p !== 'constructor' && typeof obj[p] === 'function') {
      obj[p] = obj[p].bind(obj)
    }
  })
  return obj
}

/**
 * create object and bind all
 * @function
 * @param {function} SomeClass - js class
 * @param {...object} params - params for constuctor
 * @returns {object} bind-all object
 */
exports.newAndBind = (SomeClass, ...params) => {
  const instance = new SomeClass(...params)
  exports.bindAll(Object.getPrototypeOf(instance))
  return instance
}

exports.serialize = (obj) => {
  return JSON.stringify(obj, (key, value) => {
    if (typeof value === 'bigint') { // eslint-disable-line
      return value.toString()
    }
    return value
  })
}

exports.envIs = (n, v) => process.env[n] == v // eslint-disable-line
exports.envEnabled = n => process.env[n] === '1'
exports.isDevMode = () => process.env.NODE_ENV === 'development'
exports.isProdMode = () => process.env.NODE_ENV === 'production'
