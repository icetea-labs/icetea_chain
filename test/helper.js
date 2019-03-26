const { ecc } = require('icetea-common')

exports.randomAccountWithBalance = async (tweb3, intialBalance = 10000) => {
  // This is the only key which has initial balance as defined in config.
  // However, because test suites run in parallel, we won't use this key
  // directly in tests, otherwise balance checks might fail
  const configKey = 'CJUPdD38vwc2wMC3hDsySB7YQ6AFLGuU6QYQYaiSeBsK'
  const account = await tweb3.wallet.importAccount(configKey)
  const from = account.address
  const keyInfo = await ecc.newKeyPairWithAddress()
  console.log('from', from)
  var acc = await tweb3.wallet.getAccountByAddress(from)
  console.log('privateKey1', acc.privateKey, 'acc', acc)
  var privateKey = await tweb3.wallet.getPrivateKeyByAddress(from)
  console.log('privateKey2', privateKey)
  // send money from configKey to newKey
  const result = await tweb3.sendTransactionCommit({ from: from, to: keyInfo.address, value: intialBalance })

  if (result.check_tx.code) {
    throw new Error('check_tx: ' + result.check_tx.code + ' - ' + result.check_tx.log)
  }

  if (result.deliver_tx.code) {
    throw new Error('deliver_tx: ' + result.deliver_tx.code + ' - ' + result.deliver_tx.log)
  }

  return keyInfo
}
