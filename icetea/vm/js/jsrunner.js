/** @module */
// const halts = require('halting-problem')
const babel = require('@babel/core')
const vm = require('vm')
const Runner = require('../runner')
const wrapper = require('./wrapper/raw')
const transpilePlugins = require('../../config').rawJs.transpile

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
    // Print source with line number - for debug
    if (process.env.NODE_ENV === 'development' &&
      typeof srcWrapper === 'string' &&
      context.getEnv().msg.name === '__on_deployed') {
      const { EOL } = require('os')
      const delta = 3
      const lines = srcWrapper.split(EOL).map((line, i) => ((i + delta) + ': ' + line))
      console.log(lines.join(EOL))
    }
    // TODO: change to use NodeJS's vm module
    const f = new Function('__g', '__info', srcWrapper) // eslint-disable-line

    const functionInSandbox = vm.runInNewContext(`module.exports = ${f.toString()}`, {
      module,
      exports,
      process: {
        env: {
          NODE_ENV: process.env.NODE_ENV
        }
      }
    })

    return functionInSandbox.call(context, guard, info)
  }
}
