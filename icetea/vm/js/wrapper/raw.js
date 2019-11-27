/** @module */

/**
 * Wrap raw-js contract into a safe wrapper.
 * @function
 * @param {string} src - contract source.
 * @returns {string} wrapper source.
 */
module.exports = src => `
'use strict'
const __systhis = this
const __sysmath = Math
const __sysdate = Date

{ // block to scope let/const and avoid hoisting (could use IIFE instead)

let global = {}, globalThis = {}, process = {env: {}},
    Function = void 0, WebAssembly = void 0,
    setInterval, setTimeout, setImmediate, queueMicrotask,
    clearImmediate, clearTimeout, clearInterval

{ // scoping let/const
    const makeUnsupport = name => () => {
        throw new Error(name + ' is not supported.')
    }
    setInterval = makeUnsupport('setInterval')
    setTimeout = makeUnsupport('setTimeout')
    setImmediate = makeUnsupport('setImmediate')
    queueMicrotask = makeUnsupport('queueMicrotask')
}

let require = this.runtime.require

let Math = new Proxy(__sysmath, {
    get(obj, prop) {
        if (prop === 'random') {
            return () => {
                const bl = __systhis.runtime.block
                if (!bl) {
                    throw new Error('Cannot call Math.random() in this context.')
                }
                return parseInt(bl.hash.substr(-12), 16) / 281474976710657
            }
        }
        const fn = Reflect.get(obj, prop)
        return typeof fn === 'function' ? fn.bind(obj) : fn
    }
})

function Date(...args) {
    if (!new.target) return __sysdate(...args)

    let d
    if (args.length === 0) {
        const bl = __systhis.runtime.block
        if (!bl) {
            throw new Error('Cannot call new Date() in this context.')
        }
        d = new __sysdate(bl.timestamp)
    } else {
        d = new __sysdate(...args)
    }

    d.constructor = Date
    return d
}

Date.prototype = __sysdate.prototype
Date.now = () => {
  const bl = __systhis.runtime.block
  if (!bl) {
      throw new Error('Cannot call Date.now() in this context.')
  }
  return bl.timestamp
}

Date.UTC = __sysdate.UTC
Date.parse = (...args) => {
  const d = __sysdate.parse(...args)
  return new Date(d.getTime())
}

const __guard = __g;
${src}

} // end block
`
