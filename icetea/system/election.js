/**
 * An MVP implementation of election contract.
 */

const { checkMsg } = require('../helper/types')
const { election: config } = require('../config')
const _ = require('lodash')

const METADATA = Object.freeze({

  // self-nominate to be a validator candidate
  // must attach minimum deposit
  'propose': {
    decorators: ['payable'],
    params: [],
    returnType: 'undefined'
  },

  // withdraw from a candidate list
  // can get back deposit
  'resign': {
    decorators: ['payable'],
    params: [],
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
      { name: 'candidate', type: 'address' }
    ],
    returnType: 'undefined'
  }
})

// standard contract interface
exports.run = (context, options) => {
  const { msg, block } = context.runtime
  const msgParams = checkMsg(msg, METADATA, { sysContracts: this.systemContracts() })

  const contract = {
    propose () {
      const candidates = context.getState('candidates', {})
      const me = candidates[msg.sender]
      if (me) {
        // Add more deposit, it is ok
        me.deposit = (me.deposit || BigInt(0)) + msg.value
        if (me.resigned) {
          delete me.resigned
          me.block = block.number
        }
      } else {
        candidates[msg.sender] = {
          deposit: msg.value,
          block: block.number
        }
      }

      if (candidates[msg.sender].deposit < config.minValidatorDeposit) {
        throw new Error(`Validator must deposit at least ${config.minValidatorDeposit}`)
      }

      context.setState('candidates', candidates)
    },

    resign () {
      throw new Error('Resigning is not yet supported.')
    },

    getCandidates (includeResigned = false) {
      return _getCandidates(context.getState('candidates', {}), includeResigned)
    },

    getValidators () {
      return _getValidators(contract.getCandidates())
    },

    vote (voteeAddress) {
      if (msg.sender === voteeAddress) {
        throw new Error('You cannot vote for yourself.')
      }

      if (msg.value < config.minVoterValue) {
        throw new Error(`You must attach at least ${config.minVoterValue} when voting.`)
      }

      const candidates = context.getState('candidates', {})
      const votee = candidates[voteeAddress]
      if (!votee) {
        throw new Error(`${voteeAddress} is not a valid validator address.`)
      }

      if (votee.resigned) {
        throw new Error(`${voteeAddress} has already resigned.`)
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
  candidates = _.orderBy(candidates, ['capacity', 'deposit', 'block'], ['desc', 'asc', 'asc'])

  // cut to max number of validator
  if (candidates.length > config.numberOfValidators) {
    candidates.length = config.numberOfValidators
  }

  return candidates
}

exports.getValidators = function () {
  const storage = this.unsafeStateManager().getAccountState('system.election').storage || {}
  const candidates = storage['candidates'] || {}
  return _getValidators(_getCandidates(candidates))
}

exports.slash = function (validatorAddress, slashType) {
  throw new Error('Slashing is not yet supported.')
}
