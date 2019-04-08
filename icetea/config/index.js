module.exports = {
  abciServerPort: 26658,
  feeCollector: 'tea14pcx805xcgwenkw36jdy8xhsuv598sth3mkuwa',
  initialBalances: [
    {
      address: 'tea14pcx805xcgwenkw36jdy8xhsuv598sth3mkuwa',
      balance: 1000000000000
    },
    {
      address: 'system.faucet',
      balance: 1000000000000000000000000000000
    }
  ],
  initialBotStore: {
    'system.echo_bot': {
      category: 0,
      icon: 'https://trada.tech/assets/img/logo.svg'
    }
  }
}
