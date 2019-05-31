/** @module */
const { ContractMode } = require('icetea-common')
const JsRunner = require('./jsrunner')

/**
 * Raw js or decorated js runner
 * @function
 * @param {string} [mode=ContractMode.JS_DECORATED] - contract type.
 * @returns {object} runner class with type
 */
module.exports = (mode = ContractMode.JS_RAW) => {
  return new JsRunner()
}
