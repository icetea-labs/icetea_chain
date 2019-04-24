module.exports = {
  versions: {
    node: '>=11.8.0 <12.1.0'
  },
  rawJs: {
    transpile: [
      '@babel/plugin-proposal-private-methods', // no need since Node 12
      '@babel/plugin-proposal-class-properties',
      '@babel/plugin-transform-flow-strip-types' // FIXME: this should be move into decorated-class plugins
    ]
  },
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
