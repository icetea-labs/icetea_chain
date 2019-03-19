/** @module */
const { ContractMode } = require('icetea-common')

/**
 * new js or decorated js runner
 * @function
 * @param {string} [mode=ContractMode.JS_DECORATED] - contract type.
 * @returns {object} runner class with type
 */
module.exports = (mode = ContractMode.JS_DECORATED) => {
  if (mode === ContractMode.JS_DECORATED) {
    return new (require('./DecoratedRunner')(mode))()
  }

  return new (require('./JsRunner')(mode))()
}
