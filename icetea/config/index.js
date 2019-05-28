module.exports = {
  versions: {
    node: '>=12.3.1 <13.0.0'
  },
  rawJs: {
    transpile: [
      '@babel/plugin-proposal-optional-chaining',
      '@babel/plugin-proposal-private-methods',
      '@babel/plugin-proposal-class-properties'
    ]
  },
  abciServerPort: 26658,
  feeCollector: process.env.FEE_COLLECTOR,
  initialBalances: [
    {
      address: process.env.BANK_ADDR,
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
    'lodash', 'moment', 'big.js', '@hapi/joi', 'validator', 'ajv', 'cheerio', '@icetea/polytils', 'icetea-botutils',
    'assert', 'buffer', 'crypto', 'querystring', 'stream', 'string_decoder', 'url', 'util' ]
}
