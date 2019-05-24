/** @module */
// const halts = require('halting-problem')
const babel = require('@babel/core')
const vm = require('vm')
const Runner = require('../runner')
const wrapper = require('./wrapper/raw')
const transpilePlugins = require('../../config').rawJs.transpile
const utils = require('../../helper/utils')
const path = require('path')
const fs = require('fs')

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
    const contractSrc = `(()=>function(__g){${srcWrapper}})()`
    const filename = path.resolve(process.cwd(), 'contract_src', context.address + '.js')

    // Print source for debug
    if (utils.isDevMode() &&
      typeof srcWrapper === 'string' &&
      context.runtime.msg.name === '__on_deployed') {
      fs.writeFile(filename, contractSrc, err => {
        if (err) console.error(err)
      })
    }

    const functionInSandbox = vm.runInNewContext(contractSrc, {
      process: {
        env: {
          NODE_ENV: process.env.NODE_ENV
        }
      },
      console // TODO: only enable in dev mode
    }, {
      filename,
      contextCodeGeneration: {
        strings: false,
        wasm: false
      }
    })

    return functionInSandbox.call(context, guard)
  }
}
