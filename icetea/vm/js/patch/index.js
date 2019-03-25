/** @module */

const { ContractMode } = require('icetea-common')

/**
 * return generated code function
 * @function
 * @param {string} mode - mode
 * @returns {function} function by mode
 */
module.exports = mode => {
  if (mode === ContractMode.JS_DECORATED) {
    return require('./decorated')
  }
  return require('./raw')
}
