/** @module */

/**
 * convert js to js contract
 * @function
 * @param {string} src - src
 * @returns {string} generated code
 */
module.exports = src => `
'use strict'

if (['production', 'mainnet'].includes(process.env.NODE_ENV)) {
    console = new Proxy({}, {
        get(obj, prop) {
            return () => void 0
        }
    })
}

{ // block to scope let/const and avoid hoisting (could use IIFE instead)

let global = {}, globalThis = {}, process = void 0, Function = void 0,
    setInterval = void 0, setTimeout = void 0, setImmediate = void 0,
    clearImmediate = void 0, clearTimeout = void 0, clearInterval = void 0,
    queueMicrotask = void 0, WebAssembly = void 0, Console = void 0

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

} // end block
`
