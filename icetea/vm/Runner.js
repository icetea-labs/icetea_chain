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

  /**
   * patch a source.
   * @param {string} compiledSrc - compiled source.
   * @returns {object} compiled source
   */
  patch (compiledSrc) {
    return compiledSrc
  }

  /**
   * execute contract source.
   * @param {string} compiledSrc - compiled source.
   * @param {...object} args - args needed for execute.
   * @returns {object} result from execution
   */
  run (compiledSrc, ...args) {
    const patchedSrc = this.patch(compiledSrc)
    return this.doRun(patchedSrc, ...args)
  }

  /**
   * execute contract source.
   * @param {string} patchedSrc - patched source.
   * @param {...object} args - args needed for execute.
   * @returns {object} result from execution
   */
  doRun (patchedSrc, ...args) {
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
