/** @module */
const Runner = require('../runner')
const wasmWrapper = require('./wrapper')
const { parseMetadata } = require('../../helper/wasm')
const metering = require('wasm-metering')

/** Class wasm runner */
class WasmRunner extends Runner {
  getWrapper () {
    return wasmWrapper
  }

  /**
   * Transform Wasm buffer.
   * @param {Buffer} wasmBuffer - source.
   * @returns {object} compiled source
   */
  compile (wasmBuffer) {
    return metering.meterWASM(wasmBuffer)
  }

  /**
   * do run with context.
   * @param {object} patcher - The JS wrapper around Wasm.
   * @param {object} options - options.
   */
  doRun (wrapper, { context, info }) {
    return wrapper(context, info)
  }

  /**
   * analyze wasm buffer.
   * @param {Buffer} wasmBuffer - wasm source.
   */
  analyze (wasmBuffer) {
    super.analyze(wasmBuffer)
    return parseMetadata(wasmBuffer)
  }
}

module.exports = WasmRunner
