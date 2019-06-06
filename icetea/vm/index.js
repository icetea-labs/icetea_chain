/** @module */
const { ContractMode } = require('@iceteachain/common')

/**
 * get runner
 * @function
 * @param {string} mode - contract mode
 * @returns {object} runner
 */
exports.getRunner = mode => (mode === ContractMode.WASM ? require('./wasm') : require('./js')(mode))
/**
 * get context
 * @function
 * @param {string} mode - contract mode
 * @returns {object} context
 */
exports.getContext = mode => require(mode === ContractMode.WASM ? './wasm/context' : './js/context')
/**
 * get guard
 * @function
 * @param {string} mode - contract mode
 * @returns {object} guard
 */
exports.getGuard = mode => (mode === ContractMode.WASM ? () => undefined : (require('./js/guard')(mode)))
