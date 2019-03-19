/** @module */
const Runner = require('../Runner')
const patch = require('./patch')
const { parseMetadata } = require('../../helper/wasm')
const metering = require('wasm-metering')

/** Class wasm runner */
class WasmRunner extends Runner {
  /**
   * patch a wasm buffer.
   * @param {string} wasmBuffer - wasm buffer.
   * @returns {object} patch
   */
  patch (wasmBuffer) {
    return patch(wasmBuffer)
  }

  /**
   * compile source.
   * @param {string} src - source.
   * @returns {object} compiled source
   */
  compile (src) {
    return metering.meterWASM(src, {
      meterType: 'i32'
    })
  }

  /**
   * do run with context.
   * @param {object} patcher - patcher.
   * @param {object} options - options.
   */
  doRun (patcher, { context }) {
    return patcher(context)
  }

  /**
   * analyze wasm buffer.
   * @param {string} src - wasm source.
   */
  analyze (src) {
    super.analyze(src)
    return parseMetadata(src)
  }
}

module.exports = WasmRunner
