const { ContractMode } = require('icetea-common')

module.exports = (mode = ContractMode.JS_DECORATED) => {
  if (mode === ContractMode.JS_DECORATED) {
    return new (require('./DecoratedRunner')(mode))()
  }

  return new (require('./JsRunner')(mode))()
}
