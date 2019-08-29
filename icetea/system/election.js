/**
 * An MVP implementation of election contract.
 */

const { checkMsg } = require('../helper/types')
const { election: config } = require('../config')
const _ = require('lodash')

const CONTRACT_NAME = 'system.election'
const CANDIDATES_KEY = 'candidates'

const _rawCandidates = context => context.getState(CANDIDATES_KEY, {})

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

  // request unjail for a jailed candidate
  'requestUnjail': {
    decorators: ['transaction'],
    params: [
      { name: 'pubkey', type: 'string' }
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

      const candidates = _rawCandidates(context)

      Object.values(candidates).forEach(({ name }) => {
        if (name.toLowerCase() === candidateName.toLowerCase()) {
          throw new Error(`Candidate name ${candidateName} already exists.`)
        }
      })

      const me = candidates[pubkey]

      if (me) {
        // Check update permission
        const did = exports.systemContracts().Did
        did.checkPermission(me.operator, msg.signers, block.timestamp)

        // Add more deposit, or re-propose after resigning
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

      context.setState(CANDIDATES_KEY, candidates)
    },

    resign (withdrawnAddress) {
      throw new Error('Resigning is not yet supported.')
    },

    getCandidates (includeResigned = false) {
      return _populateCapacity(_getCandidates(_rawCandidates(context), includeResigned), true)
    },

    getValidators () {
      return _getValidators(contract.getCandidates())
    },

    vote (voteePubkey) {
      if (msg.value < config.minVoterValue) {
        throw new Error(`You must attach at least ${config.minVoterValue} when voting.`)
      }

      const candidates = _rawCandidates(context)
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
      context.setState(CANDIDATES_KEY, candidates)
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
      clone.pubKey = {
        type: 'ed25519',
        data: key
      }
      result.push(clone)
    }
  })

  return result
}

function _populateCapacity (candidates, sorted) {
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
  if (sorted) {
    candidates = _.orderBy(candidates, ['capacity', 'block'], ['desc', 'asc'])
  }

  return candidates
}

function _getValidators (candidates) {
  // calculate capacity
  candidates = _populateCapacity(candidates, true)

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
  const moreThan1 = (validators.length > 1)
  validators.forEach((v, i) => {
    const pk = v.pubKey.data.toString('base64')
    c[pk] = {
      deposit: BigInt(config.minValidatorDeposit),
      block: 0,
      operator: process.env.BANK_ADDR,
      name: v.pubKey.name || ('Icetea Validator' + (moreThan1 ? (' ' + i) : ''))
    }
  })

  return state
}

exports.getValidators = function () {
  const storage = this.unsafeStateManager().getAccountState(CONTRACT_NAME).storage || {}
  const candidates = storage[CANDIDATES_KEY] || {}
  return _getValidators(_getCandidates(candidates))
}

exports.punish = function (pubkey, blockNum, tags, { slashedRatePerMillion = 0, jailedBlockCount = 0 } = {}) {
  const MILLION = 1000000; const N_MILLION = BigInt(MILLION)

  if (typeof slashedRatePerMillion !== 'number' || slashedRatePerMillion < 0 ||
    !Number.isInteger(slashedRatePerMillion) || slashedRatePerMillion > MILLION) {
    throw new Error('Invalid slashedRatePerMillion. slashedRatePerMillion must be a number between 0 and 1.')
  }

  if (typeof jailedBlockCount !== 'number' || jailedBlockCount < 0 || !Number.isInteger(jailedBlockCount)) {
    throw new Error('Invalid jailedBlockCount. jailedBlockCount must be a positive integer.')
  }

  if (slashedRatePerMillion === 0 || jailedBlockCount === 0) {
    throw new Error('Either slashedRate or jailedBlockCount must be specified.')
  }

  const storage = this.unsafeStateManager().getAccountState(CONTRACT_NAME).storage || {}
  const candidateList = storage[CANDIDATES_KEY] || {}
  const candidate = candidateList[pubkey]

  if (!candidate) {
    throw new Error(`Validator ${pubkey} not found. Cannot punish.`)
  }

  if (slashedRatePerMillion > 0) {
    // Currently, for simplicity, just slash the validator, not the voters
    const slashedAmount = candidate.deposit * N_MILLION / BigInt(slashedRatePerMillion)
    candidate.slashed = (candidate.slashed || BigInt(0)) + slashedAmount
    candidate.deposit -= slashedAmount
  }

  if (jailedBlockCount > 0) {
    candidate.jailed = true
    let pendingJailedBlock = (candidate.jailedUntilBlock && (candidate.jailedUntilBlock > blockNum))
      ? (candidate.jailedUntilBlock - blockNum) : 0
    candidate.jailedUntilBlock = blockNum + pendingJailedBlock + jailedBlockCount
  }

  // For simplicity, we don't store punishment history
  // Just raise an event at block level (tags are block level at begin/endBlock)

  // TODO: consider using tags directly instead of events

  // utils.emitEvent(CONTRACT_NAME, tags, 'ValidatorPunished', {
  //   pubkey,
  //   slashedRatePerMillion,
  //   jailedBlockCount
  // }, ['pubkey'])
}
