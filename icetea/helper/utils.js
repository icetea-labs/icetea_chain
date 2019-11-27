/** @module */

const _ = require('lodash')
const sysContracts = require('../syscon')
const { ecc, codec } = require('@iceteachain/common')
const { ondeploy, onreceive } = require('../config').messages

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

  return props
}

exports.stringifyWithBigInt = function (obj) {
  if (obj == null) return ''

  return JSON.stringify(obj, (key, value) => {
    if (typeof value === 'bigint') { // eslint-disable-line
      return value.toString()
    }
    return value
  })
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

  // copy so that we can safely delete indexed fields before serialization
  eventData = Object.assign({}, eventData)

  if (!tags.EventNames) tags.EventNames = EVENTNAMES_SEP
  if (tags.EventNames.includes(EVENTNAMES_SEP + eventName + EVENTNAMES_SEP)) {
    throw new Error('Event ' + eventName + ' was already emit')
  }
  tags.EventNames += emitter + EMITTER_EVENTNAME_SEP + eventName + EVENTNAMES_SEP
  indexes.forEach(indexedKey => {
    if (typeof indexedKey !== 'string') {
      throw new Error("Event's indexed key must be string")
    }
    if (typeof eventData[indexedKey] === 'object') {
      throw new Error("Event's indexed value cannot be an object.")
    }
    tags[eventName + EVENTNAME_INDEX_SEP + indexedKey] = eventData[indexedKey] == null ? '' : String(eventData[indexedKey])

    // it is a copy, safely to delete
    delete eventData[indexedKey]
  })

  try {
    tags[eventName] = exports.stringifyWithBigInt(eventData)
  } catch (e) {
    console.log(e)
    const newE = new Error('Cannot serialize event data to string. Make sure it is compatible with JSON.stringify.')
    newE.error = e
    throw newE
  }

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
 * emit gas used events
 * @function
 * @param {object} emitter - emmitter
 * @param {Array.<string>} tags - event tag
 * @param {string} address - contract address
 * @param {string} method - contract address method
 * @param {number} value - transfer value
 * @returns {Array.<string>} tags
 */
exports.emitGasUsed = (emitter, tags, address, method, value) => {
  return exports.emitEvent(emitter, tags, 'GasUsed', { address, method, value }, ['address', 'method', 'value'])
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

  const excepts = ['constructor', ondeploy, onreceive, 'runtime', 'getState', 'setState']
  Object.keys(meta).forEach(k => {
    if (excepts.includes(k) || k.startsWith('#') ||
      (meta[k].decorators && meta[k].decorators.includes('internal'))) {
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

  for (const name of propNames) {
    const value = object[name]

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

/**
 * Serialize data to a byte buffer to return to client when querying.
 * This is not serialize blockchain state to leveldb
 * nor serialize TX content for sending to tendermint.
 */
exports.serialize = obj => {
  if (obj && typeof obj.__getPackingContent === 'function') {
    obj = obj.__getPackingContent()
  }
  return codec.encode(obj)
}

exports.validateAddress = addr => {
  if (sysContracts.has(addr)) return
  ecc.validateAddress(addr)
}

exports.isValidAddress = addr => {
  try {
    exports.validateAddress(addr)
    return true
  } catch (err) {
    return false
  }
}

exports.validatePubKey = pubkey => {
  const b = codec.toKeyBuffer(pubkey)
  if (b.length !== 65) {
    throw new Error('The public key must be an uncompressed 64-byte length.')
  }
}

exports.envIs = (n, v) => process.env[n] == v // eslint-disable-line
exports.envEnabled = n => process.env[n] === '1'
exports.isDevMode = () => process.env.NODE_ENV === 'development'
exports.envDevEnabled = n => (exports.isDevMode() && exports.envEnabled(n))
exports.isProdMode = () => process.env.NODE_ENV === 'production'
