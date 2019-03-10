const halts = require('halting-problem')
const Runner = require('../Runner')
const babel = require('@babel/core')
const { codeFrameColumns } = require('@babel/code-frame')

module.exports = mode => {
  const patch = require('./patch')(mode)
  return class extends Runner {
    ensureES5 (src, wrap) {
      // Even current Node 11.9 --harmony does not support private method
      // (it supports private fields only).

      // Would remove this method when such things are supported natively by Node
      src = src.toString()
      if (wrap) {
        src = `(function(){${src}}).call(this);`
      }
      return babel.transformSync(src, {
        plugins: [
          '@babel/plugin-proposal-private-methods',
          '@babel/plugin-proposal-class-properties',
          '@babel/plugin-transform-flow-strip-types'
        ]
      }).code
    }

    compile (src) {
      return this.ensureES5(src, true)
    }

    analyze (src) {
      super.analyze(src)
      try {
        halts(src)
      } catch (err) {
        if (err.node && err.node.start && err.node.end) {
          const lines = src.substring(err.node.start, err.node.end)
          const cols = codeFrameColumns(lines, { start: { line: 1, column: 1 } }, {
            highlightCode: true,
            message: 'Fix this loop'
          })
          throw new Error(`Invalid or infinite loop detected.\n${cols}`)
        }
        throw err
      }
    }

    patch (compiledSrc) {
      return patch(compiledSrc)
    }

    doRun (patchedSrc, { context, guard, info }) {
      if (process.env.NODE_ENV === 'development' &&
       typeof patchedSrc === 'string' &&
       context.getEnv().msg.name === '__on_deployed') {
        const { EOL } = require('os')
        const lines = patchedSrc.split(EOL).map((line, i) => (i + ': ' + line))
        console.log(lines.join(EOL))
      }
      const f = new Function('__g', '__info', patchedSrc) // eslint-disable-line
      return f.call(context, guard, info)
    }
  }
}
