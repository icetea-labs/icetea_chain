const { ecc } = require('icetea-common')

exports.randomAccountWithBalance = async (tweb3, intialBalance = 10000) => {
  // This is the only key which has initial balance as defined in config.
  // However, because test suites run in parallel, we won't use this key
  // directly in tests, otherwise balance checks might fail
  const configKey = '/FyrD4CM92XGLyMbS8PRYWfw8h4EXQ1BGPqC+DDzsJU='

  const keyInfo = await ecc.newKeyPairWithAddress()

  // send money from configKey to newKey
  const result = await tweb3.sendTransactionCommit({ to: keyInfo.address, value: intialBalance }, configKey)

  if (result.check_tx.code) {
    throw new Error('check_tx: ' + result.check_tx.code + ' - ' + result.check_tx.log)
  }

  if (result.deliver_tx.code) {
    throw new Error('deliver_tx: ' + result.deliver_tx.code + ' - ' + result.deliver_tx.log)
  }

  return keyInfo
}
