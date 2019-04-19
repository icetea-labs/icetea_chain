/**
 * Digital identify
 * First version:
 * - owners: list of owner together with weight, default to deployedBy with weight of 1
 * - threshold: default to 1
 * - does not support anything else yet.
 */

const { Did: DID_ADDR } = require('./botnames')
const { checkMsg } = require('../helper/types')
const _ = require('lodash')

const METADATA = {
  'query': {
    decorators: ['view'],
    params: [
      { name: 'address', type: 'string' }
    ],
    returnType: ['object', 'undefined']
  },
  'register': {
    decorators: ['transaction'],
    params: [
      { name: 'address', type: 'string' },
      { name: 'props', type: 'object' }
    ],
    returnType: 'undefined'
  },
  'addOwner': {
    decorators: ['transaction'],
    params: [
      { name: 'address', type: 'string' },
      { name: 'owner', type: 'string' },
      { name: 'weight', type: ['number', 'undefined'] }
    ],
    returnType: 'undefined'
  },
  'setThreshold': {
    decorators: ['transaction'],
    params: [
      { name: 'address', type: 'string' },
      { name: 'threshold', type: ['number', 'undefined'] }
    ],
    returnType: 'undefined'
  },
  'checkPermission': {
    decorators: ['view'],
    params: [
      { name: 'address', type: 'string' },
      { name: 'signers', type: ['string', 'Array', 'undefined'] }
    ],
    returnType: 'undefined'
  }
}

function _checkValidity (owners, threshold) {
  console.log('hic', owners, threshold)
  if (threshold === undefined) {
    threshold = 1
  }

  let sum = 0
  let keys
  if (owners && ((keys = Object.keys(owners)) && keys.length)) {
    keys.forEach(addr => {
      const v = owners[addr]
      if (typeof v !== 'number' || v <= 0) {
        throw new Error('Invalid weight for owner ' + addr)
      }
      sum += v
    })
  } else {
    sum = 1 // there is no owner => same as myself only
  }

  if (typeof threshold !== 'number' || threshold <= 0) {
    throw new Error('Invalid threshold.')
  }

  if (sum < threshold) {
    console.log(sum, threshold)
    throw new Error('Threshold is bigger than sum of all owner weight.')
  }
}

function _checkPerm (address, props, signers) {
  if (!props || !props.owners || !props.owners.length) {
    return signers.includes(address)
  }
  const threshold = props.threshold || 1
  const signWeight = signers.reduce((prev, addr) => {
    prev += (props.owners[addr] || 0)
    return prev
  }, 0)

  if (signWeight < threshold) {
    throw new Error('Permission denied.')
  }
}

function _ensureAddress (address) {
  const alias = exports.systemContracts().Alias
  return alias.ensureAddress(address)
}

// standard contract interface
exports.run = (context, options) => {
  const { msg } = context.getEnv()
  checkMsg(msg, METADATA)

  const contract = {
    query (address) {
      address = _ensureAddress(address)

      const props = context.getState(address)
      return props ? _.cloneDeep(props) : undefined
    },

    register (address, { owners, threshold, attributes }) {
      if (!owners && !threshold && !attributes) {
        throw new Error('Nothing to register.')
      }

      address = _ensureAddress(address)

      if (context.getState(address)) {
        throw new Error("This address is already registered. Call 'update' to update.")
      }

      _checkValidity(owners, threshold)

      const props = {}
      if (owners && owners.length) {
        props.owners = owners
      }
      if (typeof threshold === 'number' && threshold > 0) {
        props.threshold = threshold
      }
      if (attributes) {
        props.attributes = attributes
      }

      context.setState(address, props)
    },

    checkPermission (address, signers) {
      address = _ensureAddress(address)

      signers = signers || msg.signers
      if (typeof signers === 'string') {
        signers = [signers]
      }
      const props = context.getState(address)
      _checkPerm(address, props, signers)
    },

    addOwner (address, owner, weight = 1) {
      address = _ensureAddress(address)

      contract.checkPermission(address)

      const old = context.getState(address)
      if (!old) {
        contract.register(address, { owners: { [owner]: weight } })
      } else {
        old.owners = old.owners || {}
        old.owners[owner] = weight
        _checkValidity(old.owners, old.threshold)
        context.setState(address, old)
      }
    },

    setThreshold (address, threshold) {
      address = _ensureAddress(address)

      contract.checkPermission(address)

      const old = context.getState(address)
      if (!old) {
        if (threshold !== undefined && threshold !== 1) {
          contract.register(address, { threshold })
        }
      } else {
        if (threshold === undefined || threshold === 1) {
          delete old.threshold
        } else {
          old.threshold = threshold
        }
        _checkValidity(old.owners, old.threshold)
        context.setState(address, old)
      }
    },

    setAttribute (address, name, value) {
      address = _ensureAddress(address)

      contract.checkPermission(address)

      const v = (typeof value === 'undefined') ? name : { [name]: value }
      if (typeof v !== 'object') {
        throw new Error('Invalid attribute value.')
      }

      const old = context.getState(address)
      if (!old) {
        contract.register(address, { attributes: v })
      } else {
        Object.assign(old.attributes, v)
        context.setState(address, old)
      }
    }
  }

  if (!contract.hasOwnProperty(msg.name)) {
    return METADATA
  } else {
    return contract[msg.name].apply(context, msg.params)
  }
}

exports.checkPermission = function (address, signers) {
  address = _ensureAddress(address)
  const storage = this.unsafeStateManager().getAccountState(DID_ADDR).storage || {}
  const props = storage[address]
  _checkPerm(address, props, signers)
}
