/** @module */

/**
 * convert js to js contract
 * @function
 * @param {string} src - src
 * @returns {string} generated code
 */
module.exports = src => `
'use strict';
const global = {}, globalThis = {}, process = void 0, Date = void 0,
    setInterval = void 0, setTimeout = void 0, setImmediate = void 0;
const require = void 0;
Math.random = function() {
    assert (block && block.hash, 'No block available.')
    return parseInt(block.hash.substr(-16), 16) / 18446744073709552000
}
const __guard = __g;
${src}
`
