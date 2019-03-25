/** @module */

module.exports = { check, checkTypes, checkMsg }

/**
 * whether an object is expected type
 * @private
 * @function
 * @param {object} o object
 * @param {string} t type
 * @param {string} [errorMessage = 'Incompatible type'] error message
 */
function check (o, t, errorMessage = 'Incompatible type') {
  if (!t || t === 'any') {
    return
  }

  if (typeof t !== 'string') {
    throw new Error('Type name must be string.')
  }

  if (o === null && t === 'null') {
    return
  }

  let ot = typeof o
  if (ot === t) {
    return
  }

  if (ot === 'object') {
    ot = Object.prototype.toString.call([]).split(' ')[1].slice(0, -1)
  }

  if (ot !== t) {
    throw new TypeError(`${errorMessage}: expect '${t}', got '${ot}'.`)
  }
}

/**
 * whether an object is in expected types
 * @private
 * @function
 * @param {object} o object
 * @param {Array.<string>} types types
 */
function checkTypes (o, types) {
  if (Array.isArray(types)) {
    if (!types.length) {
      return
    } else if (types.length === 1) {
      // to keep regular error with stack trace
      return check(o, types[0])
    }

    // Check OR, not AND

    let errors = []
    const ok = types.some(t => {
      try {
        check(o, t)
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
  } else {
    check(o, types)
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
  whitelist = ['address', 'balance', 'deployedBy', '__metadata']
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

  if (strict && params.length > specParams) {
    throw new Error(`Wrong number of parameter for '${name}'. Expect '${specParams.length}'. Got '${params.length}'.`)
  }

  specParams.forEach((p, index) => {
    const o = (params.length > index) ? params[index] : undefined
    checkTypes(o, p.type, `Incompatible type for parameter #${index} of '${name}'`)
  })
}
