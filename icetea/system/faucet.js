/**
 * A faucet for people to request some balance. Useful for testnet.
 */

const { checkMsg } = require('../helper/types')

const METADATA = Object.freeze({
  'getQuota': {
    decorators: ['pure'],
    params: [],
    returnType: 'number'
  },
  'request': {
    decorators: ['transaction'],
    params: [],
    returnType: 'number'
  }
})

const INTERNAL_METADATA = {
  '_agreeToPayFor': {
    decorators: ['view'],
    params: [
      { name: 'tx', type: 'object' }
    ],
    returnType: 'boolean'
  },
  '_beforePayFor': {
    decorators: ['transaction'],
    params: [
      { name: 'tx', type: 'object' }
    ],
    returnType: 'undefined'
  }
}

const REQUEST_QUOTA = BigInt(100e6)

// standard contract interface
exports.run = (context) => {
  const { msg } = context.runtime
  checkMsg(msg, Object.assign({}, INTERNAL_METADATA, METADATA))

  const contract = {
    getQuota () {
      return REQUEST_QUOTA
    },

    request () {
      const paid = BigInt(this.getState(msg.sender, BigInt(0)))
      const toPay = REQUEST_QUOTA - paid
      if (toPay <= 0) {
        throw new Error(`You already received ${paid} microtea. No more.`)
      }

      if (!this.balance) {
        throw new Error('This faucet is out of balance.')
      }

      const available = REQUEST_QUOTA > this.balance ? this.balance : REQUEST_QUOTA
      const amount = available > toPay ? toPay : available

      this.setState(msg.sender, String(amount))
      this.transfer(msg.sender, amount + paid)

      this.emitEvent('FaucetTransferred', {
        requester: msg.sender,
        amount: String(amount)
      }, ['requester'])

      return amount
    },

    _agreeToPayFor (tx) {
      const requested = BigInt(tx.value || 0) + BigInt(tx.fee || 0)
      if (requested <= 0) {
        return true
      }
      const paid = BigInt(this.getState(tx.from, BigInt(0)))
      const amount = paid + requested
      if (amount > REQUEST_QUOTA) {
        // throw an error to provide more info than just false
        throw new Error('Requested amount from faucet is bigger than remaining quota.')
      }

      if (amount > this.balance) {
        // throw an error to provide more info than just false
        throw new Error('Faucet out of money.')
      }

      return true
    },

    _beforePayFor (tx) {
      if (msg.sender !== 'system') {
        throw new Error('This function is reserved for internal use.')
      }

      const requested = tx.value + tx.fee
      if (requested <= 0) {
        return
      }

      const paid = BigInt(this.getState(tx.from, BigInt(0)))
      const amount = paid + requested
      if (amount > REQUEST_QUOTA) {
        // throw an error to provide more info than just returning false
        throw new Error('Requested amount from faucet is bigger than remaining quota.')
      }

      if (amount > this.balance) {
        // throw an error to provide more info than just returning false
        throw new Error('Faucet out of money.')
      }

      this.setState(tx.from, String(amount))
      this.emitEvent('FaucetTransferred', {
        requester: tx.from,
        amount: String(requested)
      }, ['requester'])
    }
  }

  if (!contract.hasOwnProperty(msg.name)) {
    return METADATA
  } else {
    return contract[msg.name].apply(context, msg.params)
  }
}
