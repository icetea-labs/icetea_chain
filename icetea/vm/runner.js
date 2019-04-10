/** @module */

/** Class runner */
class Runner {
  /**
   * lint source.
   * @param {string} src - source.
   * @returns {object} linted source
   */
  lint (src) {
    return src
  }

  /**
   * compile source.
   * @param {string} src - source.
   * @returns {object} compiled source
   */
  compile (src) {
    return src
  }

  getWrapper () {
    return src => src
  }

  /**
   * Returns a runable wrapper for compiled JS source or Wasm Buffer.
   * @param {string|Buffer} compiledSrc - compiled JS source or WasmBuffer.
   * @returns {object} compiled source
   */
  wrap (compiledSrc) {
    return this.getWrapper()(compiledSrc)
  }

  /**
   * execute contract source.
   * @param {string} compiledSrc - compiled source.
   * @param {...object} args - args needed for execute.
   * @returns {object} result from execution
   */
  run (compiledSrc, ...args) {
    const wrapper = this.wrap(compiledSrc)
    return this.doRun(wrapper, ...args)
  }

  /**
   * execute contract source.
   * @param {string} wrapper - Runable wrapper around JS source or Wasm Buffer.
   * @param {...object} args - args needed for execute.
   * @returns {object} result from execution
   */
  doRun (wrapper, ...args) {
    throw new Error('Not implemented')
  }

  /**
   * analyze source code.
   * @return {object} src.
   */
  analyze (src) {
    this.lint(src)
  }
}

module.exports = Runner
