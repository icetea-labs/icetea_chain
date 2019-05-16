require('dotenv').config()
const { ecc, codec } = require('icetea-common')
const { IceTeaWeb3, utils } = require('icetea-web3')

exports.switchEncoding = utils.switchEncoding

exports.web3 = {
  default: function () {
    return exports.web3.http()
  },
  http: function () {
    return new IceTeaWeb3('http://localhost:26657')
  },
  https: function () {
    return new IceTeaWeb3('https://localhost:26657')
  },
  ws: function () {
    return new IceTeaWeb3('ws://localhost:26657/websocket')
  },
  wss: function () {
    return new IceTeaWeb3('wss://localhost:26657/websocket')
  }
}

exports.randomAccountWithBalance = async (tweb3, intialBalance = 10000) => {
  // This is the only key which has initial balance as defined in config.
  // However, because test suites run in parallel, we won't use this key
  // directly in tests, otherwise balance checks might fail
  const configKey = process.env.BANK_KEY
  const account = await tweb3.wallet.importAccount(configKey)
  const from = account.address
  const keyInfo = await ecc.newKeys(codec.BANK_ACCOUNT)

  // send money from configKey to newKey
  await tweb3.sendTransactionCommit({ from: from, to: keyInfo.address, value: intialBalance })

  return keyInfo
}
