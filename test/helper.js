const ecc = require('../icetea/helper/ecc')

exports.randomAccountWithBalance = async (tweb3, intialBalance) => {
  // This is the only key which has initial balance as defined in config.
  // However, because test suites run in parallel, we won't use this key
  // directly in tests, otherwise balance checks might fail
  const configKey = '5K4kMyGz839wEsG7a9xvPNXCmtgFE5He2Q8y9eurEQ4uNgpSRq7'
  const from = ecc.toPublicKey(configKey)

  const newKey = await ecc.generateKey()
  const to = ecc.toPublicKey(newKey)

  // send money from configKey to newKey
  await tweb3.sendTransactionCommit({ from, to, value: intialBalance }, configKey)

  return { key: newKey, address: to }
}
