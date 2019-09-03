/**
 * Digital identify
 * First version:
 * - owners: list of owner together with weight, default to deployedBy with weight of 1
 * - threshold: default to 1
 * - inheritance
 * - only support direct signature, does not recursive
 */

const { Did: DID_ADDR } = require('./sysconnames')
const { checkMsg } = require('../helper/types')
const _ = require('lodash')

const STATE_CLAIMING = 1
const STATE_REJECTED = 2

const METADATA = Object.freeze({
  query: {
    decorators: ['view'],
    params: [
      { name: 'address', type: 'address' }
    ],
    returnType: ['object', 'undefined']
  },
  register: {
    decorators: ['transaction'],
    params: [
      { name: 'address', type: 'address' },
      { name: 'props', type: 'object' }
    ],
    returnType: 'undefined'
  },
  addOwner: {
    decorators: ['transaction'],
    params: [
      { name: 'address', type: 'address' },
      { name: 'owner', type: 'string' },
      { name: 'weight', type: ['number', 'undefined'] }
    ],
    returnType: 'undefined'
  },
  removeOwner: {
    decorators: ['transaction'],
    params: [
      { name: 'address', type: 'address' },
      { name: 'owner', type: 'string' },
      { name: 'weight', type: ['number', 'undefined'] }
    ],
    returnType: 'undefined'
  },
  clearOwnership: {
    decorators: ['transaction'],
    params: [
      { name: 'address', type: 'address' }
    ],
    returnType: 'undefined'
  },
  setThreshold: {
    decorators: ['transaction'],
    params: [
      { name: 'address', type: 'address' },
      { name: 'threshold', type: ['number', 'undefined'] }
    ],
    returnType: 'undefined'
  },
  addInheritor: {
    decorators: ['transaction'],
    params: [
      { name: 'address', type: 'address' },
      { name: 'inheritor', type: 'address' },
      { name: 'waitPeriod', type: 'number' },
      { name: 'lockPeriod', type: 'number' }
    ],
    returnType: 'undefined'
  },
  removeInheritor: {
    decorators: ['transaction'],
    params: [
      { name: 'address', type: 'address' },
      { name: 'inheritor', type: 'address' }
    ],
    returnType: 'undefined'
  },
  claimInheritance: {
    decorators: ['transaction'],
    params: [
      { name: 'address', type: 'address' },
      { name: 'claimer', type: 'address' }
    ],
    returnType: 'undefined'
  },
  rejectInheritanceClaim: {
    decorators: ['transaction'],
    params: [
      { name: 'address', type: 'address' },
      { name: 'claimer', type: 'address' }
    ],
    returnType: 'undefined'
  },
  isActiveInheritor: {
    decorators: ['transaction'],
    params: [
      { name: 'address', type: 'address' },
      { name: 'inheritor', type: 'address' }
    ],
    returnType: 'undefined'
  },
  setTag: {
    decorators: ['transaction'],
    params: [
      { name: 'address', type: 'address' },
      { name: 'name', type: ['string', 'object'] },
      { name: 'value', type: 'any' }
    ],
    returnType: 'undefined'
  },
  removeTag: {
    decorators: ['transaction'],
    params: [
      { name: 'address', type: 'address' },
      { name: 'name', type: 'string' }
    ],
    returnType: 'undefined'
  },
  checkPermission: {
    decorators: ['view'],
    params: [
      { name: 'address', type: 'address' },
      { name: 'signers', type: ['address', 'Array', 'undefined'] }
    ],
    returnType: 'undefined'
  }
})

function _checkValidity (owners, threshold) {
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
    throw new Error('Threshold is bigger than sum of all owner weight.')
  }
}

function _checkPerm (address, props, signers, now) {
  if (!_checkOwner(address, props, signers) && !_checkInheritance(props, signers, now)) {
    throw new Error('Permission denied.')
  }
}

function _checkOwner (address, props, signers) {
  if (!props || !props.owners || !Object.keys(props.owners).length) {
    return signers.includes(address)
  }
  const threshold = props.threshold || 1
  const signWeight = signers.reduce((prev, addr) => {
    prev += (props.owners[addr] || 0)
    return prev
  }, 0)

  return signWeight >= threshold
}

function _checkInheritance (props, signers, now) {
  if (!props || !props.inheritors || !Object.keys(props.inheritors).length) {
    return false
  }

  const inheritors = props.inheritors
  return signers.some(s => _checkClaim(inheritors[s], now))
}

function _checkClaim (data, now) {
  if (!data || data.state !== STATE_CLAIMING) {
    return false
  }

  const claimDate = new Date(data.lastClaim)
  // add wait period
  claimDate.setDate(claimDate.getDate() + data.waitPeriod)
  // convert to millisecond
  const waitUntil = claimDate.getTime()
  if (waitUntil >= now) {
    return false
  }

  return true
}

// standard contract interface
exports.run = (context) => {
  const { msg, block } = context.runtime
  const msgParams = checkMsg(msg, METADATA, { sysContracts: this.systemContracts() })

  const contract = {
    query (address) {
      const props = context.getState(address)
      return props ? _.cloneDeep(props) : undefined
    },

    // FIXME: should validate inside (like ensure addresses), or make it private
    register (address, { owners, threshold, tags, inheritors }) {
      contract.checkPermission(address)

      if (!owners && !threshold && !tags && !inheritors) {
        throw new Error('Nothing to register.')
      }

      if (context.getState(address)) {
        throw new Error('This address is already registered.')
      }

      _checkValidity(owners, threshold)

      const props = {}
      if (owners && Object.keys(owners).length) {
        props.owners = owners
      }
      if (typeof threshold === 'number' && threshold > 0) {
        props.threshold = threshold
      }
      if (tags) {
        props.tags = tags
      }
      if (inheritors) {
        props.inheritors = inheritors
      }

      context.setState(address, props)
    },

    checkPermission (address, signers) {
      signers = signers || msg.signers
      if (typeof signers === 'string') {
        signers = [signers]
      }
      const props = context.getState(address)
      _checkPerm(address, props, signers, block.timestamp)
    },

    addOwner (address, owner, weight = 1) {
      const old = context.getState(address)
      if (!old) {
        contract.register(address, { owners: { [owner]: weight } })
      } else {
        contract.checkPermission(address)

        old.owners = old.owners || {}
        old.owners[owner] = weight
        _checkValidity(old.owners, old.threshold)
        context.setState(address, old)
      }
    },

    removeOwner (address, owner) {
      contract.checkPermission(address)

      const old = context.getState(address)
      if (!old || !old.owners || !old.owners[owner]) {
        throw new Error(`${owner} is not an owner of ${address}.`)
      }

      if (Object.keys(old.owners).length === 1 && owner !== address) {
        throw new Error('Cannot remove the only owner.')
      }

      delete old.owners[owner]

      if (Object.keys(old.owners).length === 0) {
        delete old.owners
      }

      _checkValidity(old.owners, old.threshold)
      context.setState(address, old)
    },

    clearOwnership (address) {
      contract.checkPermission(address)

      const old = context.getState(address)
      if (!old) {
        return
      }

      delete old.threshold
      delete old.owners
      context.setState(address, old)
    },

    setThreshold (address, threshold) {
      const old = context.getState(address)
      if (!old) {
        if (threshold !== undefined && threshold !== 1) {
          contract.register(address, { threshold })
        }
      } else {
        contract.checkPermission(address)

        if (threshold === undefined || threshold === 1) {
          delete old.threshold
        } else {
          old.threshold = threshold
        }
        _checkValidity(old.owners, old.threshold)
        context.setState(address, old)
      }
    },

    addInheritor (address, inheritor, waitPeriod, lockPeriod) {
      waitPeriod = parseInt(waitPeriod)
      lockPeriod = parseInt(lockPeriod)
      if (!waitPeriod || waitPeriod <= 0 || !lockPeriod || lockPeriod <= 0) {
        throw new Error('waitPeriod and lockPeriod must be positive number of days.')
      }

      const old = context.getState(address)
      if (!old) {
        contract.register(address, {
          inheritors: {
            [inheritor]: { waitPeriod, lockPeriod }
          }
        })
      } else {
        contract.checkPermission(address)

        old.inheritors = old.inheritors || {}
        old.inheritors[inheritor] = Object.assign(old.inheritors[inheritor] || {}, { waitPeriod, lockPeriod })
        context.setState(address, old)
      }
    },

    removeInheritor (address, inheritor) {
      contract.checkPermission(address)

      const old = context.getState(address)
      if (!old || !old.inheritors || !old.inheritors[inheritor]) {
        throw new Error(`${inheritor} is not an inheritor of ${address}.`)
      }

      delete old.inheritors[inheritor]

      context.setState(address, old)
    },

    claimInheritance (address, claimer) {
      const did = context.getState(address)
      if (!did || !did.inheritors || !Object.keys(did.inheritors).length) {
        throw new Error('No inheritors configured for this account.')
      }
      const inheritors = did.inheritors

      // ensure that claimer is an inheritor
      const data = inheritors[claimer]
      if (!data || !data.waitPeriod || !data.lockPeriod) {
        throw new Error(`${claimer} is not correctly configured as an inheritor for this account.`)
      }

      if (data.state === STATE_CLAIMING) {
        throw new Error('Already claimed.')
      }

      if (data.lastRejected) {
        const dt = new Date(data.lastRejected)
        dt.setDate(dt.getDate() + data.lockPeriod)
        const lockUntil = dt.getTime()
        if (lockUntil >= block.timestamp) {
          throw new Error('Claim permission for this inheritor was locked, please wait until ' + dt.toGMTString())
        }
      }

      // ensure that the account is idle for at least [minIdle] days
      // THIS IS HARD, WE DO NOT STORE LAST TX ANYWARE INSIDE ICETEA
      // SO MUST QUERY TENDERMINT!!!
      // PENDING

      // set last claim timestamp
      data.state = STATE_CLAIMING
      data.lastClaim = block.timestamp
      // save
      context.setState(address, did)
    },

    rejectInheritanceClaim (address, claimer) {
      // ensure only owners can call
      contract.checkPermission(address)

      const did = context.getState(address)
      if (!did || !did.inheritors || !Object.keys(did.inheritors).length) {
        throw new Error('No inheritors configured for this account.')
      }
      const inheritors = did.inheritors

      // ensure that claimer is an inheritor
      const data = inheritors[claimer]
      if (!data) {
        throw new Error(`${claimer} is not correctly configured as an inheritor for this account.`)
      }

      if (data.state !== STATE_CLAIMING) {
        throw new Error(`${claimer} does not currently claim so no need to reject.`)
      }

      // set last claim timestamp
      data.state = STATE_REJECTED
      data.lastRejected = block.timestamp
      // save
      context.setState(address, did)
    },

    isActiveInheritor (address, inheritor) {
      const did = context.getState(address)
      if (!did || !did.inheritors || !Object.keys(did.inheritors).length) {
        return false
      }
      const inheritors = did.inheritors

      const data = inheritors[inheritor]
      return _checkClaim(data, block.timestamp)
    },

    setTag (address, name, value) {
      const v = (typeof value === 'undefined') ? name : { [name]: value }
      if (typeof v !== 'object') {
        throw new Error('Invalid tag value.')
      }

      const old = context.getState(address)
      if (!old) {
        contract.register(address, { tags: v })
      } else {
        contract.checkPermission(address)

        old.tags = Object.assign(old.tags || {}, v)
        context.setState(address, old)
      }
    },

    removeTag (address, name) {
      contract.checkPermission(address)

      const old = context.getState(address)
      if (!old || !old.tags || !old.tags[name]) {
        throw new Error(`${name} is not a tag of ${address}.`)
      }

      delete old.tags[name]
      if (Object.keys(old.tags).length === 0) {
        delete old.tags // save some space
      }
      if (Object.keys(old).length === 0) {
        context.deleteState(address)
      } else {
        context.setState(address, old)
      }
    }
  }

  if (!Object.prototype.hasOwnProperty.call(contract, msg.name)) {
    return METADATA
  } else {
    return contract[msg.name].apply(context, msgParams)
  }
}

exports.checkPermission = function (address, signers, now) {
  const storage = this.unsafeStateManager().getAccountState(DID_ADDR).storage || {}
  const props = storage[address]
  _checkPerm(address, props, signers, now)
}
