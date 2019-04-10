/** @module */

const JsRunner = require('./jsrunner')
const wrapper = require('./wrapper/decorated')

/**
 * Decorated runner class.
 */
module.exports = class extends JsRunner {
  compile (src) {
    // load babel plugins
    const decoratedPlugins = this.loadPlugins('./babel/decorated')

    // The decorated plugins should append this, but for now we add here to simplify
    src = src.toString() + ';const __contract = new __contract_name();const __metadata = {};'

    // Now transpile decorated class to raw
    src = this.transpile(src, decoratedPlugins)

    // wrap the src in the 'decorated wrapper'
    src = wrapper(src)

    // Then run it through the raw compiler
    return super.compile(src)
  }

  run (compiledSrc, ...args) {
    // wrap it in raw wrapper, because we already wrap in the 'decorated wrapper'
    const wrapper = super.wrap(compiledSrc)
    return this.doRun(wrapper, ...args)
  }
}
