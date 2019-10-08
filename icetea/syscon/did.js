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
  // Change register to private, since it is complicated to expose
  // (we must validate structure carefully if exposed)
  /*
  register: {
    decorators: ['transaction'],
    params: [
      { name: 'address', type: 'address' },
      { name: 'props', type: 'object' }
    ],
    returnType: 'undefined'
  }, */
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
  grantAccessToken: {
    decorators: ['transaction'],
    params: [
      { name: 'ownerAddr', type: 'address' },
      { name: 'contractAddr', type: ['Array', 'address'] },
      { name: 'tokenAddr', type: 'address' },
      { name: 'ms', type: 'number' }
    ],
    returnType: 'undefined'
  },
  revokeAccessToken: {
    decorators: ['transaction'],
    params: [
      { name: 'ownerAddr', type: 'address' },
      { name: 'contractAddr', type: ['Array', 'address'] },
      { name: 'tokenAddr', type: 'address' }
    ],
    returnType: 'undefined'
  },
  revokeAllAccessTokens: {
    decorators: ['transaction'],
    params: [
      { name: 'ownerAddr', type: 'address' },
      { name: 'contractAddr', type: ['Array', 'address'] }
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
      { name: 'tx', type: ['object', 'undefined'] },
      { name: 'asAdmin', type: ['boolean', 'undefined'] }
    ],
    returnType: 'undefined'
  },
  checkAdminPermission: {
    decorators: ['view'],
    params: [
      { name: 'address', type: 'address' },
      { name: 'tx', type: ['object', 'undefined'] }
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

function _checkPerm (address, props, tx, block, asAdmin) {
  const now = (block && block.timestamp) || 0
  const isAdmin = _checkOwner(address, props, tx) || _checkInheritance(props, tx, now)
  if (isAdmin) return

  if (asAdmin || tx.value > 0 || !_checkAccessToken(props, tx, now)) {
    throw new Error('Permission denied.')
  }
}

function _checkOwner (address, props, { signers }) {
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

function _checkInheritance (props, { signers }, now) {
  if (!props || !props.inheritors || !Object.keys(props.inheritors).length) {
    return false
  }

  const inheritors = props.inheritors
  return signers.some(s => _checkClaim(inheritors[s], now))
}

function _checkAccessToken (props, { signers, to }, now) {
  if (!to) return false
  if (!props || !props.tokens || !Object.keys(props.tokens).length) {
    return false
  }

  const tokens = props.tokens[to]
  if (!tokens) return false
  return signers.some(s => _checkTokenValid(tokens[s], now))
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

function _checkTokenValid (data, now) {
  if (!data || !data.expireAfter) {
    return false
  }

  return now <= data.expireAfter
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

    // NOTE: this method is private (not exposed via metadata, so we won't validate parameter structure)
    register (address, { owners, threshold, tokens, tags, inheritors }) {
      contract.checkPermission(address, undefined, owners || threshold || tokens || inheritors)

      if (!owners && !threshold && !tags && !inheritors && !tokens) {
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
      if (tokens) {
        props.tokens = tokens
      }

      if (tags) {
        props.tags = tags
      }
      if (inheritors) {
        props.inheritors = inheritors
      }

      context.setState(address, props)
    },

    checkAdminPermission (address, tx) {
      return this.checkPermission(address, tx, true)
    },

    checkPermission (address, tx = {}, asAdmin) {
      tx.signers = tx.signers || msg.signers
      if (!Array.isArray(tx.signers)) {
        tx.signers = [tx.signers]
      }
      if (!tx.to) {
        tx.to = context.address
      }
      const props = context.getState(address)
      _checkPerm(address, props, tx, block, asAdmin)
    },

    addOwner (address, owner, weight = 1) {
      const old = context.getState(address)
      if (!old) {
        contract.register(address, { owners: { [owner]: weight } })
      } else {
        contract.checkAdminPermission(address)

        old.owners = old.owners || {}
        old.owners[owner] = weight
        _checkValidity(old.owners, old.threshold)
        context.setState(address, old)
      }
    },

    removeOwner (address, owner) {
      contract.checkAdminPermission(address)

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
      contract.checkAdminPermission(address)

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
        contract.checkAdminPermission(address)

        if (threshold === undefined || threshold === 1) {
          delete old.threshold
        } else {
          old.threshold = threshold
        }
        _checkValidity(old.owners, old.threshold)
        context.setState(address, old)
      }
    },

    grantAccessToken (ownerAddr, contracts, tokenAddr, ms) {
      // tokens
      //  contract
      //    token
      //      expireAfter
      //      match (name, params, value) - not yet support
      //      perms: ['sign', { type: 'spend', data: {quota: 10000, dailyQuota: 1000, txQuota: 100 }} ]

      // FOR NOW, we will skip the spend perm and only allow signing

      if (ms < 1 || !Number.isInteger(ms)) {
        throw new Error('Duration must be a valid integer of milliseconds.')
      }

      if (!Array.isArray(contracts)) {
        contracts = [contracts]
      }

      const expireAfter = block.timestamp + ms

      const old = context.getState(ownerAddr)
      if (!old) {
        const data = {}
        contracts.forEach(c => {
          data[c] = { [tokenAddr]: { expireAfter } }
        })
        contract.register(ownerAddr, {
          tokens: data
        })
      } else {
        contract.checkAdminPermission(ownerAddr)

        old.tokens = old.tokens || {}
        contracts.forEach(contractAddr => {
          const oldContract = old.tokens[contractAddr] = old.tokens[contractAddr] || {}

          // delete expired tokens
          const now = block.timestamp
          Object.entries(oldContract).forEach(([t, value]) => {
            if (now > value.expireAfter) {
              delete oldContract[t]
            }
          })

          const oldToken = oldContract[tokenAddr] = oldContract[tokenAddr] || {}
          oldToken.expireAfter = expireAfter
        })

        context.setState(ownerAddr, old)
      }
    },

    revokeAccessToken (ownerAddr, contracts, tokenAddr) {
      contract.checkAdminPermission(ownerAddr)
      const old = context.getState(ownerAddr)
      if (!old || !old.tokens) return
      const tokens = old.tokens

      if (!Array.isArray(contracts)) {
        contracts = [contracts]
      }

      contracts.forEach(contractAddr => {
        if (!tokens[contractAddr][tokenAddr]) return

        if (!Object.keys(tokens[contractAddr]).length === 1) {
          delete tokens[contractAddr]
        } else {
          delete tokens[contractAddr][tokenAddr]
        }
      })

      context.setState(ownerAddr, old)
    },

    revokeAllAccessTokens (ownerAddr, contracts) {
      contract.checkAdminPermission(ownerAddr)
      const old = context.getState(ownerAddr)
      if (!old || !old.tokens) return
      const tokens = old.tokens

      if (!Array.isArray(contracts)) {
        contracts = [contracts]
      }

      contracts.forEach(contractAddr => {
        delete tokens[contractAddr]
      })

      context.setState(ownerAddr, old)
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
        contract.checkAdminPermission(address)

        old.inheritors = old.inheritors || {}
        old.inheritors[inheritor] = Object.assign(old.inheritors[inheritor] || {}, { waitPeriod, lockPeriod })
        context.setState(address, old)
      }
    },

    removeInheritor (address, inheritor) {
      contract.checkAdminPermission(address)

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
      // 1. store in account storage
      // 2. store in did (so did must receive every tx)
      // lastTx: { txHash, block: height & timestamp }
      // maybe we should have onTxCompleted event on bus for system component to listen
      // or maybe we should store them separately in a leveldb

      // set last claim timestamp
      data.state = STATE_CLAIMING
      data.lastClaim = block.timestamp
      // save
      context.setState(address, did)
    },

    rejectInheritanceClaim (address, claimer) {
      // ensure only owners can call
      contract.checkAdminPermission(address)

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

exports.checkPermission = function (address, tx, block) {
  const storage = this.unsafeStateManager().getAccountState(DID_ADDR).storage || {}
  const props = storage[address]
  _checkPerm(address, props, tx, block)
}

exports.checkPermissionFromContract = function (address, contract) {
  const { msg, block } = contract.runtime
  const tx = {
    ...msg,
    from: msg.sender,
    to: contract.address
  }

  exports.checkPermission(address, tx, block)
}
