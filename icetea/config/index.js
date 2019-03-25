module.exports = {
  abciServerPort: 26658,
  feeCollector: 'tea_3M76NHiZ4ipvMmTVBVJ1Wj378RLJ',
  initialBalances: [
    {
      address: 'tea_3M76NHiZ4ipvMmTVBVJ1Wj378RLJ',
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
