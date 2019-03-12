const REQUEST_AMOUNT = 10

module.exports = function () {
  const msg = this.getEnv().msg
  const receivers = this.getState('receivers', {})
  switch (msg.name) {
    case 'getAmount':
      return REQUEST_AMOUNT
    case 'request': {
      if (receivers[msg.sender]) {
        throw new Error(`You already received ${receivers[msg.sender]}. No more.`)
      }
      if (!this.balance) {
        throw new Error('This faucet is out of balance.')
      }
      const v = REQUEST_AMOUNT > this.balance ? this.balance : REQUEST_AMOUNT
      receivers[msg.sender] = v
      this.setSate('receivers', receivers)
      break
    }
    case 'withdraw': {
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
      break
    }

    default:
      // call unsupported function -> inform caller our function list
      return {
        'getAmount': { decorators: ['view'] },
        'request': { decorators: ['transaction'] },
        'withdraw': {
          decorators: ['transaction'],
          params: [
            { name: 'amount', type: ['number', 'undefined'] }
          ]
        }
      }
  }
}
