/** @module */
// const halts = require('halting-problem')
const babel = require('@babel/core')
const vm = require('vm')
const sizeof = require('object-sizeof')
const Runner = require('../runner')
const wrapper = require('./wrapper/raw')
const transpilePlugins = require('../../config').rawJs.transpile
const utils = require('../../helper/utils')
const config = require('../../config')

const { freeGasLimit, minStateGas, gasPerByte, maxTxGas } = config.gas
const path = require('path')
const fs = require('fs')
const debugFactory = require('debug')
const debug = debugFactory('icetea:jsrunner')
const contractDebug = debugFactory('icetea:contract')
contractDebug.log = console.log.bind(console)

/**
 * js runner
 */
module.exports = class extends Runner {
  getWrapper () {
    return wrapper
  }

  loadPlugins (path) {
    const plugins = require(path)(babel)
    return Array.isArray(plugins) ? plugins : [plugins]
  }

  transpile (src, plugins, sourceFilename = 'Contract source') {
    return babel.transformSync(src, {
      parserOpts: {
        sourceType: 'script',
        strictMode: true,
        sourceFilename,
        allowReturnOutsideFunction: true,
        allowAwaitOutsideFunction: true,
        plugins: [
          'asyncGenerators',
          'bigInt',
          'classPrivateMethods',
          'classPrivateProperties',
          'classProperties',
          ['decorators', { decoratorsBeforeExport: false }],
          'doExpressions',
          // 'dynamicImport',
          // 'exportDefaultFrom',
          // 'exportNamespaceFrom',
          'flow',
          'flowComments',
          'functionBind',
          'functionSent',
          // 'importMeta',
          'jsx',
          'logicalAssignment',
          'nullishCoalescingOperator',
          'numericSeparator',
          'objectRestSpread',
          'optionalCatchBinding',
          'optionalChaining',
          ['pipelineOperator', { proposal: 'minimal' }],
          'throwExpressions'
        ]
      },
      retainLines: false,
      minified: false,
      sourceMaps: false,
      plugins
    }).code
  }

  compile (src) {
    src = `(function(){${src}}).call(this);`

    // FIXME:
    // Maybe we should find a way to combine these 2 transpiles
    // Currently, split because of ordering problem

    const plugins = this.loadPlugins('./babel/raw')
    src = 'return ' + this.transpile(src, plugins)

    if (transpilePlugins && transpilePlugins.length) {
      src = this.transpile(src, transpilePlugins)
    }

    return src
  }

  /**
   * Returns a runable wrapper for compiled source.
   * @param {string|Buffer} compiledSrc source ready for being wrapped.
   */
  wrap (compiledSrc) {
    return wrapper(compiledSrc)
  }

  doRun (srcWrapper, { context, guard, info }) {
    let gasLimit = maxTxGas
    if (context.emitEvent) { // isTx
      const userGas = freeGasLimit + Number(context.runtime.msg.fee)
      gasLimit = userGas > maxTxGas ? maxTxGas : userGas
    }

    // Print source with line number - for debug
    const contractSrc = `(()=>function(__g){${srcWrapper}})()`
    const filename = path.resolve(process.cwd(), 'contract_src', `${context.address}.js`)

    // Print source for debug
    if (utils.isDevMode() &&
      typeof srcWrapper === 'string' &&
      context.runtime.msg.name === config.messages.ondeploy) {
      fs.writeFile(filename, contractSrc, err => {
        if (err) debug(err)
      })
    }

    let gasUsed = 0
    const isDevMode = utils.isDevMode()
    const functionInSandbox = vm.runInNewContext(contractSrc, {
      console: {
        log: isDevMode ? contractDebug : () => undefined
      }
    }, {
      filename,
      contextCodeGeneration: {
        strings: false,
        wasm: false
      }
    })

    const runCtx = { ...context }
    runCtx.setState = (key, value) => {
      gasUsed += minStateGas
      const oldValue = context.getState(key)
      if (oldValue === null || oldValue === undefined) {
        gasUsed += sizeof({ key: value }) * gasPerByte
      } else {
        const oldSize = sizeof({ key: oldValue })
        const newSize = sizeof({ key: value })
        gasUsed += Math.abs(newSize - oldSize) * gasPerByte
      }

      if (gasUsed > gasLimit) {
        throw new Error(`setState ${key} failed: out of gas`)
      }

      context.setState(key, value)
    }
    runCtx.deleteState = (key, subKeys) => {
      gasUsed += minStateGas

      if (gasUsed > gasLimit) {
        throw new Error(`deleteState ${key} failed: out of gas.`)
      }

      context.deleteState(key, subKeys)
    }

    const runGuard = { ...guard }
    runGuard.usegas = gas => {
      if (gas <= 0) {
        throw new Error('Gas must be a positive number.')
      }
      gasUsed += gas

      if (gasUsed > gasLimit) {
        if (context.emitEvent) { // isTX
          throw new Error('Out of gas.')
        }
        throw new Error('Out of allowed resources.')
      }
    }

    Object.freeze(runCtx)
    Object.freeze(runGuard)

    const result = functionInSandbox.call(runCtx, runGuard)
    if (info) {
      if (gasUsed > 0) {
        if (info.__gas_used) {
          info.__gas_used += gasUsed // gas sum for contract call contract
        } else {
          info.__gas_used = gasUsed
        }
      }

      // last check for contract call contract
      if (info.__gas_used > gasLimit) {
        if (context.emitEvent) { // isTX
          throw new Error('Out of gas.')
        }
        throw new Error('Out of allowed resources.')
      }
    }

    return result
  }
}
