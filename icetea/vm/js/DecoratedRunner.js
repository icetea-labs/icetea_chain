const babel = require('@babel/core')

module.exports = mode => {
  const JsRunner = require('./JsRunner')(mode)
  const contractPlugins = require('./babel')(mode)(babel)

  return class extends JsRunner {
    compile (src) {
      src = src.toString() + ';const __contract = new __contract_name();const __metadata = {};'
      var result = babel.transformSync(src, {
        parserOpts: {
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
        plugins: contractPlugins,
        sourceMaps: false
      })

      // console.log(result.code);
      return this.ensureES5(result.code)
    }
  }
}
