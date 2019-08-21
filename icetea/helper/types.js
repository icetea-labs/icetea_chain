/** @module */

const { validateAddress } = require('@iceteachain/common').ecc
const sysContractNames = Object.values(require('../system/sysconnames'))
const { ensureAddress } = require('../system/alias')

/**
 * whether an object is expected type
 * @private
 * @function
 * @param {object} o object
 * @param {string} t type
 * @param {string} [errorMessage = 'Incompatible type'] error message
 */
function check (o, t, {
  errorMessage = 'Incompatible type',
  sysContracts = {}
} = {}) {
  if (!t || t === 'any') {
    return o
  }

  if (typeof t !== 'string') {
    throw new Error('Type name must be string.')
  }

  if (o === null && t === 'null') {
    return o
  }

  if (t === 'address' || t === 'pureaddress') {
    if (t === 'address') {
      o = (ensureAddress || sysContracts.Alias.ensureAddress)(o)
    }
    sysContractNames.includes(o) || validateAddress(o)
    return o
  }

  let ot = typeof o
  if (ot === t) {
    return o
  }

  if (ot === 'object') {
    ot = Object.prototype.toString.call(o).split(' ')[1].slice(0, -1)
  }

  if (ot !== t) {
    throw new TypeError(`${errorMessage}: expect '${t}', got '${ot}'.`)
  }

  return o
}

/**
 * whether an object is in expected types
 * @private
 * @function
 * @param {object} o object
 * @param {Array.<string>} types types
 */
function checkTypes (o, types, opts) {
  if (Array.isArray(types)) {
    if (!types.length) {
      return o
    } else if (types.length === 1) {
      // to keep regular error with stack trace
      return check(o, types[0], opts)
    }

    // Check OR, not AND

    let errors = []
    const ok = types.some(t => {
      try {
        check(o, t, opts)
        return true // one type pass, stop here no need check other types
      } catch (e) {
        errors.push(e)
      }
    })

    if (!ok) {
      const errorMsg = errors.reduce((prev, e) => {
        prev.push(e.message)
        return prev
      }, []).join('; ')
      const newError = new Error(errorMsg)
      newError.errors = errors
      throw newError
    }

    return o
  } else {
    return check(o, types, opts)
  }
}

/**
 * whether suitable message
 * @private
 * @function
 * @param {object} msg message
 * @param {opject} spec specification
 * @param {object} options options
 */
function checkMsg ({ name, callType, params = [] }, spec, {
  strict = true,
  whitelist = ['address', 'balance', 'deployedBy', '__metadata'],
  sysContracts = {}
} = {}) {
  if (!name || typeof name !== 'string') {
    throw new Error(`Invalid message name: '${name}'.`)
  }

  if (!Array.isArray(params)) {
    throw new Error(`Invalid parameters for ${name}: ${params}`)
  }

  if (!(name in spec)) {
    if (whitelist === '*' || whitelist.includes(name)) {
      return
    } else {
      throw new Error(`Message '${name}' is not supported by this contract.`)
    }
  }

  // check call type: transaction, view, pure, metadata
  let specDecos
  if (!spec[name].decorators || !spec[name].decorators.length) {
    if (strict) {
      specDecos = ['view']
    }
  } else {
    specDecos = spec[name].decorators
  }

  if (specDecos && !specDecos.includes(callType)) {
    throw new Error(`Invalid call type, expect '${specDecos.join(', ')}', got '${callType}'.`)
  }

  const specParams = spec[name].params || []

  if (strict && params.length > specParams.length) {
    throw new Error(`Wrong number of parameter for '${name}'. Expect '${specParams.length}'. Got '${params.length}'.`)
  }

  const newParams = [ ...params ]
  specParams.forEach((p, index) => {
    const hasValue = newParams.length > index
    const o = hasValue ? newParams[index] : undefined
    const newValue = checkTypes(o, p.type, {
      errorMessage: `Incompatible type for parameter #${index} of '${name}'`,
      sysContracts
    })
    if (hasValue) {
      // set satinized param
      newParams[index] = newValue
    }
  })

  return newParams
}

module.exports = { check, checkTypes, checkMsg }
