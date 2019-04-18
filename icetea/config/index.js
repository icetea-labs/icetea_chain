module.exports = {
  abciServerPort: 26658,
  feeCollector: 'tea1al54h8fy75h078syz54z6hke6l9x232zyk25cx',
  initialBalances: [
    {
      address: 'tea1al54h8fy75h078syz54z6hke6l9x232zyk25cx',
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
