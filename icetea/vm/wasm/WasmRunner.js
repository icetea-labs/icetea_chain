const Runner = require('../Runner')
const patch = require('./patch')
const { parseMetadata } = require('../../helper/wasm')

module.exports = class extends Runner {
  patch (wasmBuffer) {
    return patch(wasmBuffer)
  }

  doRun (patcher, { context }) {
    return patcher(context)
  }

  verify (src) {
    super.verify(src)
    return parseMetadata(src)
  }
}
