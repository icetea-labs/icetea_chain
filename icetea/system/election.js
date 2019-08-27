/**
 * An MVP implementation of election contract.
 */

const { checkMsg } = require('../helper/types')
const { election: config } = require('../config')
const _ = require('lodash')

const METADATA = Object.freeze({

  // nominate a validator candidate
  // must attach minimum deposit
  'propose': {
    decorators: ['payable'],
    params: [
      { name: 'pubkey', type: 'string' },
      { name: 'candidateName', type: 'string' }
    ],
    returnType: 'undefined'
  },

  // withdraw from a candidate list
  // can get back deposit
  'resign': {
    decorators: ['payable'],
    params: [
      { name: 'withdrawnAddress', type: ['address', 'undefined'] }
    ],
    returnType: 'undefined'
  },

  // Get all validator candidates
  'getCandidates': {
    decorators: ['view'],
    params: [
      { name: 'includeResigned', type: ['boolean', 'undefined'] }
    ],
    returnType: 'Array'
  },

  'getValidators': {
    decorators: ['view'],
    params: [],
    returnType: 'Array'
  },

  // Vote for a candidate
  // can attach any value (minimum configurable)
  'vote': {
    decorators: ['payable'],
    params: [
      { name: 'pubkey', type: 'string' }
    ],
    returnType: 'undefined'
  }
})

// standard contract interface
exports.run = (context, options) => {
  const { msg, block } = context.runtime
  const msgParams = checkMsg(msg, METADATA, { sysContracts: this.systemContracts() })

  const contract = {
    propose (pubkey, candidateName) {
      pubkey = pubkey.trim()
      if (!pubkey) {
        throw new Error('Public key is required.')
      }

      candidateName = candidateName.trim()
      if (!candidateName) {
        throw new Error('Validator candidate name is required.')
      }

      const candidates = context.getState('candidates', {})

      Object.values(candidates).forEach(({ name }) => {
        if (name.toLowerCase() === candidateName.toLowerCase()) {
          throw new Error(`Candidate name ${candidateName} already exists.`)
        }
      })

      const me = candidates[pubkey]

      if (me) {
        // Check if sender is a owner of operator ac permission over the operator
        const did = exports.systemContracts().Did
        did.checkPermission(me.operator, msg.signers, block.timestamp)

        // Add more deposit, it is ok
        me.deposit = (me.deposit || BigInt(0)) + msg.value
        if (me.resigned) {
          delete me.resigned
          me.block = block.number
          me.operator = msg.sender
          me.name = candidateName
        }
      } else {
        candidates[pubkey] = {
          deposit: msg.value,
          block: block.number,
          operator: msg.sender,
          name: candidateName
        }
      }

      if (candidates[pubkey].deposit < config.minValidatorDeposit) {
        throw new Error(`Validator must deposit at least ${config.minValidatorDeposit}`)
      }

      context.setState('candidates', candidates)
    },

    resign (withdrawnAddress) {
      throw new Error('Resigning is not yet supported.')
    },

    getCandidates (includeResigned = false) {
      return _getCandidates(context.getState('candidates', {}), includeResigned)
    },

    getValidators () {
      return _getValidators(contract.getCandidates())
    },

    vote (voteePubkey) {
      if (msg.value < config.minVoterValue) {
        throw new Error(`You must attach at least ${config.minVoterValue} when voting.`)
      }

      const candidates = context.getState('candidates', {})
      const votee = candidates[voteePubkey]
      if (!votee) {
        throw new Error(`${voteePubkey} is not a valid validator candidate public key.`)
      }

      if (votee.resigned) {
        throw new Error(`${voteePubkey} has already resigned.`)
      }

      votee.voters = votee.voters || {}
      votee.voters[msg.sender] = (votee.voters[msg.sender] || BigInt(0)) + msg.value

      // kind of stupid we set the whole object while only change small
      // in the future, maybe support setStateIn()
      context.setState('candidates', candidates)
    }
  }

  if (!contract.hasOwnProperty(msg.name)) {
    return METADATA
  } else {
    return contract[msg.name].apply(context, msgParams)
  }
}

function _getCandidates (candidates, includeResigned) {
  // we will need to clone it so that caller cannot modify directly
  const result = []
  Object.entries(candidates).forEach(([key, value]) => {
    if (includeResigned || !value.resigned) {
      const clone = _.cloneDeep(value)
      clone.address = key
      result.push(clone)
    }
  })

  return result
}

function _getValidators (candidates) {
  // calculate capacity
  candidates.forEach(c => {
    let capacity = c.deposit
    if (c.voters) {
      capacity += Object.values(c.voters).reduce((v, sum) => {
        sum += BigInt(v)
        return sum
      }, BigInt(0))
    }
    c.capacity = capacity
  })

  // sort by capacity
  // if all equal, it will be in order of insert (order of transaction)
  candidates = _.orderBy(candidates, ['capacity', 'block'], ['desc', 'asc'])

  // cut to max number of validator
  if (candidates.length > config.numberOfValidators) {
    candidates.length = config.numberOfValidators
  }

  return candidates
}

exports.ondeploy = (state, { consensusParams, validators }) => {
  state.storage = {
    candidates: {}
  }
  const c = state.storage.candidates
  validators.forEach(v => {
    const pk = v.pubKey.data.toString('base64')
    c[pk] = {
      deposit: config.minValidatorDeposit,
      block: 0,
      operator: process.env.BANK_ADDR,
      name: 'Icetea Validator'
    }
  })

  return state
}

exports.getValidators = function () {
  // const storage = this.unsafeStateManager().getAccountState('system.election').storage || {}
  // const candidates = storage['candidates'] || {}
  // return _getValidators(_getCandidates(candidates))
  return []
}

exports.slash = function () {
  throw new Error('Slashing is not yet supported.')
}
