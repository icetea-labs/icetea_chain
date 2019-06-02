require('dotenv').config()
const { ecc } = require('icetea-common')
const { IceteaWeb3 } = require('icetea-web3')

exports.switchEncoding = function (text, from, to) {
  const buf = Buffer.isBuffer(text) ? text : Buffer.from(text, from)
  return buf.toString(to)
}

exports.web3 = {
  default: function () {
    return exports.web3.http()
  },
  http: function () {
    return new IceteaWeb3('http://localhost:26657')
  },
  https: function () {
    return new IceteaWeb3('https://localhost:26657')
  },
  ws: function () {
    return new IceteaWeb3('ws://localhost:26657/websocket')
  },
  wss: function () {
    return new IceteaWeb3('wss://localhost:26657/websocket')
  }
}

exports.randomAccountWithBalance = async (tweb3, intialBalance = 10000) => {
  // This is the only key which has initial balance as defined in config.
  // However, because test suites run in parallel, we won't use this key
  // directly in tests, otherwise balance checks might fail
  const configKey = process.env.BANK_KEY
  const account = await tweb3.wallet.importAccount(configKey)
  const from = account.address
  const keyInfo = await ecc.newBankKeys()

  // send money from configKey to newKey
  await tweb3.transfer(keyInfo.address, intialBalance, { from })

  return keyInfo
}

exports.sleep = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms))
}
