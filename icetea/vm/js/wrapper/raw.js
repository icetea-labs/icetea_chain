/** @module */

/**
 * convert js to js contract
 * @function
 * @param {string} src - src
 * @returns {string} generated code
 */
module.exports = src => `
'use strict'

let global = {}, globalThis = {}, process = void 0, Function = void 0,
    setInterval = void 0, setTimeout = void 0, setImmediate = void 0;

let require = name => {
    throw new Error('Module ' + name + " is not whitelisted and then cannot be used with 'require'.")
}
Math.random = () => (
    parseInt(this.getEnv().block.hash.substr(-16), 16) / 18446744073709552000
)

const __sysdate = Date
Date = class {
    constructor(...args) {
    let d
    if (args.length === 0) {
        d = new __sysdate(this.getEnv().block.timestamp * 1000)
    } else {
        d = new __sysdate(...args)
    }
    
    return new Proxy(d, {
        get(obj, prop) {
        return Reflect.get(obj, prop).bind(obj)
        }
    })
    }
}
Date.now = () => ( this.getEnv().block.timestamp * 1000 )
    
const __guard = __g;
${src}
`
