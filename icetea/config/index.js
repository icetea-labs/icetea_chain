const config = {
  versions: {
    node: '>=11.8.0 <13.0.0'
  },
  rawJs: {
    transpile: [
      '@babel/plugin-proposal-private-methods',
      '@babel/plugin-proposal-class-properties'
    ]
  },
  abciServerPort: 26658,
  feeCollector: 'teat1al54h8fy75h078syz54z6hke6l9x232zq3j9st',
  initialBalances: [
    {
      address: 'teat1al54h8fy75h078syz54z6hke6l9x232zq3j9st',
      balance: BigInt(1000000000000)
    },
    {
      address: 'system.faucet',
      balance: BigInt(1000000000000000000000000000000)
    }
  ],
  initialBotStore: {
    'system.echo_bot': {
      category: 0,
      icon: 'https://trada.tech/assets/img/logo.svg'
    }
  },
  whitelistModules: [
    'lodash', 'moment', 'bn.js', '@hapi/joi', 'validator', 'cheerio', '@icetea/botutils', 'icetea-botutils',
    'assert', 'buffer', 'console', 'constants', 'crypto', 'querystring', 'stream', 'string_decoder', 'url', 'util' ],
  contract: {
    minStateGas: 200,
    freeGasLimit: 1e9,
    gasPerByte: 1,
    minTxGas: 0,
    maxTxGas: 1e12
  },
  // method
  setFreeGasLimit: (freeGasLimit = 0) => {
    config.contract.freeGasLimit = freeGasLimit
  }
}

module.exports = config
