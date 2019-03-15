const { ContractMode } = require('icetea-common')

module.exports = mode => {
  if (mode === ContractMode.JS_DECORATED) {
    return require('./decorated')
  }

  return require('./raw')
}
