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
      { name: 'owner', type: 'string' }
    ],
    returnType: 'undefined'
  },
  'removeOwner': {
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
  'setTag': {
    decorators: ['transaction'],
    params: [
      { name: 'address', type: 'string' },
      { name: 'name', type: 'string' },
      { name: 'value', type: 'any' }
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
  if (!props || !props.owners || !Object.keys(props.owners).length) {
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

// function _checkInheritance (address, props, signers) {
//   if (!props || !props.inheritors || !Object.keys(props.inheritors).length) {
//     return signers.includes(address)
//   }
//   const threshold = props.threshold || 1
//   const signWeight = signers.reduce((prev, addr) => {
//     prev += (props.owners[addr] || 0)
//     return prev
//   }, 0)

//   if (signWeight < threshold) {
//     throw new Error('Permission denied.')
//   }
// }

function _ensureAddress (address) {
  const alias = exports.systemContracts().Alias
  return alias.ensureAddress(address)
}

// standard contract interface
exports.run = (context, options) => {
  const { msg, block } = context.getEnv()
  checkMsg(msg, METADATA)

  const contract = {
    query (address) {
      address = _ensureAddress(address)

      const props = context.getState(address)
      return props ? _.cloneDeep(props) : undefined
    },

    // FIXME: should validate inside (like ensure addresses), or make it private
    register (address, { owners, threshold, tags, inheritors }) {
      if (!owners && !threshold && !tags && !inheritors) {
        throw new Error('Nothing to register.')
      }

      address = _ensureAddress(address)

      if (context.getState(address)) {
        throw new Error('This address is already registered.')
      }

      _checkValidity(owners, threshold)

      const props = {}
      if (owners && owners.length) {
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
      owner = _ensureAddress(owner)

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

    removeOwner (address, owner) {
      address = _ensureAddress(address)
      owner = _ensureAddress(owner)

      contract.checkPermission(address)

      const old = context.getState(address)
      if (!old || !old.owners || !old.owners[owner]) {
        throw new Error(`${owner} is not an owner of ${address}.`)
      }

      delete old.owners[owner]

      _checkValidity(old.owners, old.threshold)
      context.setState(address, old)
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

    addInheritor (address, inheritor, waitPeriod, lockPeriod) {
      address = _ensureAddress(address)
      inheritor = _ensureAddress(inheritor)

      contract.checkPermission(address)

      const old = context.getState(address)
      if (!old) {
        contract.register(address, {
          inheritors: {
            [inheritor]: { waitPeriod, lockPeriod }
          }
        })
      } else {
        old.inheritors = old.inheritors || {}
        old.inheritors[inheritor] = Object.assign(old.inheritors[inheritor] || {}, { waitPeriod, lockPeriod })
        context.setState(address, old)
      }
    },

    removeInheritor (address, inheritor) {
      address = _ensureAddress(address)
      inheritor = _ensureAddress(inheritor)

      contract.checkPermission(address)

      const old = context.getState(address)
      if (!old || !old.inheritors || !old.inheritors[inheritor]) {
        throw new Error(`${inheritor} is not an inheritor of ${address}.`)
      }

      delete old.inheritors[inheritor]

      context.setState(address, old)
    },

    claimInheritance (address, claimer) {
      // resolve alias if needed
      address = _ensureAddress(address)
      claimer = _ensureAddress(claimer)

      const did = context.getState(address)
      if (!did || !did.inheritors || !did.inheritors.length) {
        throw new Error('No inheritors configured for this account.')
      }
      const inheritors = did.inheritors

      // ensure that claimer is an inheritor
      const data = !inheritors[claimer]
      if (!data || !data.waitPeriod || !data.lockPeriod) {
        throw new Error(`${claimer} is not correctly configured as an inheritor for this account.`)
      }

      // ensure that claimer is not locked OR (already claim & not denied)
      if (data.lastClaim && (!data.lastRejected || data.lastRejected < data.lastClaim)) {
        // Does not matter last claim succeeded or not, you cannot claim again
        throw new Error('Already claimed.')
      }

      if (data.lastRejected) {
        const dt = new Date(data.lastRejected * 1000)
        dt.setDate(dt.getDate() + data.lockPeriod)
        const lockUntil = (dt.getTime() / 1000) | 0 // | 0 means floor()
        if (lockUntil >= block.timestamp) {
          throw new Error('Claim permission for this inheritor was locked, please wait until ' + dt.toGMTString())
        }
      }

      // ensure that the account is idle for at least [minIdle] days
      // THIS IS HARD, WE DO NOT STORE LAST TX ANYWARE INSIDE ICETEA
      // SO MUST QUERY TENDERMINT!!!
      // PENDING

      // set last claim timestamp
      data.lastClaim = block.timestamp
      // save
      context.setState(address, did)
    },

    rejectInheritanceClaim (address, claimer) {
      // resolve alias if needed
      address = _ensureAddress(address)
      claimer = _ensureAddress(claimer)

      // ensure only owners can call
      contract.checkPermission(address)

      const did = context.getState(address)
      if (!did || !did.inheritors || !did.inheritors.length) {
        throw new Error('No inheritors configured for this account.')
      }
      const inheritors = did.inheritors

      // ensure that claimer is an inheritor
      const data = !inheritors[claimer]
      if (!data) {
        throw new Error(`${claimer} is not correctly configured as an inheritor for this account.`)
      }

      // set last claim timestamp
      data.lastRejected = block.timestamp
      // save
      context.setState(address, did)
    },

    isActiveInheritor (address, inheritor) {
      address = _ensureAddress(address)
      inheritor = _ensureAddress(inheritor)

      const did = context.getState(address)
      if (!did || !did.inheritors || !did.inheritors.length) {
        return false
      }
      const inheritors = did.inheritors

      const data = !inheritors[inheritor]
      if (!data) {
        return false
      }

      if (!data.lastClaim) {
        return false
      }

      const claimDate = new Date(data.lastClaim * 1000)
      claimDate.setDate(claimDate.getDate() + data.waitPeriod)
      const waitUntil = (claimDate.getTime() / 1000) | 0 // | 0 means floor()
      if (waitUntil >= block.timestamp) {
        return false
      }

      return true
    },

    setTag (address, name, value) {
      address = _ensureAddress(address)

      contract.checkPermission(address)

      const v = (typeof value === 'undefined') ? name : { [name]: value }
      if (typeof v !== 'object') {
        throw new Error('Invalid tag value.')
      }

      const old = context.getState(address)
      if (!old) {
        contract.register(address, { tags: v })
      } else {
        Object.assign(old.tags, v)
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
