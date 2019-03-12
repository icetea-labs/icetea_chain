/**
 * A faucet for people to request some balance. Useful for testnet.
 */

const { checkMsg } = require('../helper/types')

const METADATA = {
  'getAmount': {
    decorators: ['view'],
    returnType: 'number'
  },
  'request': {
    decorators: ['transaction'],
    returnType: 'number'
  },
  'withdraw': {
    decorators: ['transaction'],
    params: [
      { name: 'amount', type: ['number', 'undefined'] }
    ],
    returnType: 'number'
  }
}

const REQUEST_AMOUNT = 10

// standard contract interface
exports.run = (context) => {
  const { msg } = context.getEnv()
  checkMsg(msg, METADATA)

  const contract = {
    getAmount () {
      return REQUEST_AMOUNT
    },

    request () {
      const receivers = this.getState('receivers', {})
      if (receivers[msg.sender]) {
        throw new Error(`You already received ${receivers[msg.sender]}. No more.`)
      }
      if (!this.balance) {
        throw new Error('This faucet is out of balance.')
      }
      const v = REQUEST_AMOUNT > this.balance ? this.balance : REQUEST_AMOUNT
      receivers[msg.sender] = v
      this.setState('receivers', receivers)
      this.transfer(msg.sender, v)
      this.emitEvent('FaucetRequested', {
        requester: msg.sender,
        amount: v
      }, ['requester'])

      return v
    },

    withdraw () {
      if (this.deployedBy !== msg.sender) {
        throw new Error('Only contract owner can withdraw.')
      }
      let amount = this.balance
      if (msg.params && msg.params.length) {
        amount = msg.params[0]
        if (typeof amount !== 'number' || amount > this.balance) {
          throw new Error('Invalid withdrawal amount.')
        }
      }
      this.transfer(this.deployedBy, amount)

      return amount
    }
  }

  if (!contract.hasOwnProperty(msg.name)) {
    return METADATA
  } else {
    return contract[msg.name].apply(context, msg.params)
  }
}
