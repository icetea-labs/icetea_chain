/**
 * An MVP implementation of election contract.
 */
const { checkMsg } = require('../helper/types')
const { election: config } = require('../config')
const _ = require('lodash')

const CONTRACT_NAME = 'system.election'
const CANDIDATES_KEY = 'candidates'
const WITHDRAW_KEY = 'withdraw'

const _rawCandidates = c => c.getState(CANDIDATES_KEY, {})
const _rawWithdrawList = c => c.getState(WITHDRAW_KEY, {})

const METADATA = Object.freeze({

  // nominate a validator candidate
  // must attach minimum deposit
  propose: {
    decorators: ['payable'],
    params: [
      { name: 'pubkey', type: 'string' },
      { name: 'candidateName', type: 'string' }
    ],
    returnType: 'undefined'
  },

  // resign from a candidate list
  // can get back deposit
  resign: {
    decorators: ['transaction'],
    params: [
      { name: 'pubkey', type: 'string' }
    ],
    returnType: 'undefined'
  },

  withdraw: {
    decorators: ['transaction'],
    params: [
      { name: 'withDrawTo', type: ['address', 'undefined'] }
    ],
    returnType: 'undefined'
  },

  unvote: {
    decorators: ['transaction'],
    params: [
      { name: 'pubkey', type: 'string' }
    ],
    returnType: 'undefined'
  },

  changeVote: {
    decorators: ['transaction'],
    params: [
      { name: 'fromPubKey', type: 'string' },
      { name: 'toPubKey', type: 'string' },
      { name: 'amount', type: ['number', 'string', undefined] }
    ],
    returnType: 'undefined'
  },

  // request unjail for a jailed candidate
  requestUnjail: {
    decorators: ['transaction'],
    params: [
      { name: 'pubkey', type: 'string' }
    ],
    returnType: 'undefined'
  },

  // Get all validator candidates
  getCandidates: {
    decorators: ['view'],
    params: [
      { name: 'includeJailed', type: ['boolean', 'undefined'] }
    ],
    returnType: 'Array'
  },

  getValidators: {
    decorators: ['view'],
    params: [],
    returnType: 'Array'
  },

  getWithdrawalList: {
    decorators: ['view'],
    params: [
      { name: 'addressOrAlias', type: ['address', 'undefined'] }
    ],
    returnType: 'object'
  },

  // Vote for a candidate
  // can attach any value (minimum configurable)
  vote: {
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

        // Add more deposit
        me.deposit = (me.deposit || BigInt(0)) + msg.value
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

    resign (pubkey) {
      const candidates = _rawCandidates(context)
      const me = candidates[pubkey]

      if (!me) {
        throw new Error(`Validator candidate ${pubkey} not found.`)
      }

      // Check resign permission
      const did = exports.systemContracts().Did
      did.checkPermission(me.operator, msg.signers, block.timestamp)

      // move to withdrawal key
      const withdrawList = _rawWithdrawList(context)

      // add items for validator
      _addToWithdrawList(withdrawList, me.operator, me.deposit, block.number + config.resignValidatorLock)

      // add items for voters
      if (me.voters) {
        Object.entries(me.voters).forEach(([addr, amount]) => {
          _addToWithdrawList(withdrawList, addr, amount, block.number + config.resignVoterLock)
        })
      }

      // delete from candidate list
      delete candidates[pubkey]

      context.setState(CANDIDATES_KEY, candidates)
      context.setState(WITHDRAW_KEY, withdrawList)
    },

    changeVote (fromPubKey, toPubKey, amount) {
      const candidates = _rawCandidates(context)
      const from = candidates[fromPubKey]
      if (!from) {
        throw new Error(`Validator candidate ${fromPubKey} not found.`)
      }
      if (!from.voters || !from.voters[msg.sender]) {
        throw new Error(`You did not vote for ${fromPubKey}.`)
      }

      const oldAmount = from.voters[msg.sender]
      if (amount == null) {
        amount = oldAmount
      } else {
        amount = BigInt(amount)
        if (amount > oldAmount) {
          throw new Error(`Amount too large. Amount must be no greater than ${oldAmount}.`)
        }
      }

      from.voters[msg.sender] -= amount
      if (!from.voters[msg.sender]) {
        delete from.voters[msg.sender]
        if (!Object.keys(from.voters).length) {
          delete from.voters
        }
      }

      const to = candidates[toPubKey]
      if (!to) {
        throw new Error(`Validator candidate ${toPubKey} not found.`)
      }
      const toVoters = to.voters || (to.voters = {})
      toVoters[msg.sender] = (toVoters[msg.sender] || BigInt(0)) + amount

      // save things
      context.setState(CANDIDATES_KEY, candidates)
    },

    getWithdrawalList (addrOrAlias = msg.sender) {
      if (!addrOrAlias || typeof addrOrAlias !== 'string') {
        throw new Error('Invalid address or alias.')
      }
      const withdrawList = _rawWithdrawList(context)
      const me = withdrawList[addrOrAlias]

      if (!me) {
        return {}
      }

      return _.cloneDeep(me)
    },

    withdraw (withDrawTo = msg.sender) {
      // move to withdrawal key
      const withdrawList = _rawWithdrawList(context)
      const me = withdrawList[msg.sender]

      if (!me) {
        throw new Error('You do not have any pending asset to withdraw.')
      }

      let amount = BigInt(0)
      Object.entries(me).forEach(([blockNum, value]) => {
        if (block.number >= blockNum) {
          amount += value
          delete me[blockNum]
        }
      })

      if (!amount) {
        throw new Error('No asset eligible for withdrawal. Call getWithdrawalList to see when you can withdraw.')
      }

      if (!Object.keys(me).length) {
        delete withdrawList[msg.sender]
      }

      context.transfer(withDrawTo, amount)
    },

    getCandidates (includeJailed = false) {
      return _populateCapacity(_getCandidates(_rawCandidates(context), includeJailed), true)
    },

    getValidators () {
      return _getValidators(contract.getCandidates())
    },

    vote (pubkey) {
      if (msg.value < config.minVoterValue) {
        throw new Error(`You must attach at least ${config.minVoterValue} when voting.`)
      }

      const candidates = _rawCandidates(context)
      const votee = candidates[pubkey]
      if (!votee) {
        throw new Error(`${pubkey} is not a valid validator candidate public key.`)
      }

      if (votee.jailed) {
        throw new Error(`${pubkey} is currently jailed, please wait until it get unjail before voting.`)
      }

      votee.voters = votee.voters || {}
      votee.voters[msg.sender] = (votee.voters[msg.sender] || BigInt(0)) + msg.value

      // kind of stupid we set the whole object while only change small
      // in the future, maybe support setStateIn()
      context.setState(CANDIDATES_KEY, candidates)
    },

    unvote (pubkey) {
      const candidates = _rawCandidates(context)
      const votee = candidates[pubkey]
      if (!votee) {
        throw new Error(`${pubkey} is not a valid validator candidate public key.`)
      }

      const amount = (votee.voters || {})[msg.sender]

      if (!amount) {
        throw new Error('You did not vote for this node, so no need to unvote.')
      }

      // move to withdrawal key
      const withdrawList = _rawWithdrawList(context)
      _addToWithdrawList(withdrawList, msg.sender, amount, block.number + config.unvoteLock)

      // delete the voter
      delete votee.voters[msg.sender]
      if (!Object.keys(votee.voters).length) {
        delete votee.voters
      }

      // save things
      context.setState(CANDIDATES_KEY, candidates)
      context.setState(WITHDRAW_KEY, withdrawList)
    }
  }

  if (!Object.prototype.hasOwnProperty.call(contract, msg.name)) {
    return METADATA
  } else {
    return contract[msg.name].apply(context, msgParams)
  }
}

function _getCandidates (candidates, includeJailed) {
  // we will need to clone it so that caller cannot modify directly
  const result = []
  Object.entries(candidates).forEach(([key, value]) => {
    if (includeJailed || !value.jailed) {
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
      capacity += Object.values(c.voters).reduce((v, sum) => (v + sum), BigInt(0))
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

function _addToWithdrawList (withdrawList, address, amount, unlockBlock) {
  const w = withdrawList[address] || (withdrawList[address] = {})
  w[unlockBlock] = (w[unlockBlock] || BigInt(0)) + amount
}

exports.ondeploy = (state, { validators }) => {
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
      name: v.pubKey.name || ('Genesis Validator' + (moreThan1 ? (' ' + i) : ''))
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
    const pendingJailedBlock = (candidate.jailedUntilBlock && (candidate.jailedUntilBlock > blockNum))
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
