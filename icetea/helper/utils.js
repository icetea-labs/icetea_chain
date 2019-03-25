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

/**
 * emit transfered events
 * @function
 * @param {object} emitter - emmitter
 * @param {Array.<string>} tags - event tag
 * @param {string} from - from address
 * @param {string} to - to address
 * @param {number} value - transfer value
 * @returns {Array.<string>} tags
 */
exports.emitTransferred = (emitter, tags, from, to, value) => {
  return exports.emitEvent(emitter, tags, 'Transferred', { from, to, value }, ['from', 'to'])
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

  const excepts = ['constructor', '__on_deployed', '__on_received', 'getEnv', 'getState', 'setState']
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
  var propNames = Object.getOwnPropertyNames(object)

  // Freeze properties before freezing self

  for (let name of propNames) {
    let value = object[name]

    object[name] = value && typeof value === 'object'
      ? exports.deepFreeze(value) : value
  }

  return Object.freeze(object)
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
  const instance = new SomeClass(params)
  exports.bindAll(Object.getPrototypeOf(instance))
  return instance
}
