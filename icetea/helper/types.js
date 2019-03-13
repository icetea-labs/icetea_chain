module.exports = { check, checkTypes, checkMsg }

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

function checkTypes (o, types) {
  Array.isArray(types) ? types.forEach(t => check(o, t)) : check(o, types)
}

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
  if (!spec.decorators || !spec.decorators.length) {
    if (strict) {
      specDecos = ['view']
    }
  } else {
    specDecos = spec.decorators
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
