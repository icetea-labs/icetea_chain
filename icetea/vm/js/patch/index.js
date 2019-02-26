const { ContractMode } = require('../../../enum')

module.exports = mode => {
  if (mode === ContractMode.JS_DECORATED) {
    return require('./decorated')
  }
  return require('./raw')
}
