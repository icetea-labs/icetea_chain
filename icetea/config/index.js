// NOTE: this file is used by web folder as well, so don't use BigInt (error on Safari)

const config = {
  versions: {
    node: '>=12.9.1 <13.0.0'
  },
  rawJs: {
    transpile: [
      '@babel/plugin-proposal-nullish-coalescing-operator',
      '@babel/plugin-proposal-optional-chaining',
      '@babel/plugin-proposal-private-methods',
      '@babel/plugin-proposal-class-properties'
    ]
  },
  election: {
    numberOfValidators: 4,
    minValidatorDeposit: 10e6,
    minVoterValue: 1e6,
    epoch: 4,
    resignValidatorLock: 10,
    resignVoterLock: 1,
    unvoteLock: 5
  },
  gate: {
    minProviderDeposit: 10e6,
    providerIdRegEx: /^[A-Za-z]\w{7,31}$/
  },
  abciServerPort: 26658,
  feeCollector: process.env.FEE_COLLECTOR,
  initialBalances: [
    {
      address: process.env.BANK_ADDR,
      balance: '1000000000000'
    },
    {
      address: 'system.faucet',
      balance: '1000000000000000000000000000000'
    }
  ],
  initialBotStore: {
    'system.echo_bot': {
      category: 0,
      icon: 'https://trada.tech/assets/img/logo.svg'
    }
  },
  whitelistModules: [
    'lodash', 'moment', 'big.js', '@hapi/joi', 'validator', 'ajv', 'cheerio', '@iceteachain/utils', ';',
    'assert', 'buffer', 'crypto', 'querystring', 'stream', 'string_decoder', 'url', 'util', 'create-hash'],
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
