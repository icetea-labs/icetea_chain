var halts = require('halting-problem');
const Runner = require("../Runner");

//
// POLICY:
// 1. Verify: use Linter & some other tricks
// 2. Compile: use babel, do not patch, minify to save to blockchain less space
// 3. Run: patch and run

// Current rule:
// Linters: run before compile & patch
// 1. Error if use Node's global, process (TODO: investigate more about avoid global vars)
// 2. Error if use Node's passed in (module, require, exports, __dirname)
// 3. Error is use Math & Date class
// 4. Use of defined keywords: block, now, msg, state, address, transfer, require, revert, assert
// 5. Warning: loop map/Object.keys, Object.values: could ensure if machine use same V8 engine?
// 6. Warning: floating points non-deterministics
// Others:
// 1. Must has one class decorated with @contract
// 2. That class must not define a constructor

// Babel
// 1. Just compile with decorator & minify
// 2. Consider transform for-in (needed?)

// Patch
// 1. SafeDate class
// 2. SafeMath class
// 3. Object keys
// 4. BigNumber
// 5. global, process, module, require, exports, __dirname = undefined
// 6. Date, Math == undefined

const babel = require("@babel/core");
const contractPlugins = require('./babel')(babel);
const {codeFrameColumns} = require("@babel/code-frame");

const Patch = require('./patch/');

module.exports = class JsRunner extends Runner {
    lint(src) {
        src = super.lint(src);
        src = babel.transformSync(src, {
            plugins: [
                ["@babel/plugin-proposal-decorators", {decoratorsBeforeExport:false}],
                "@babel/plugin-proposal-class-properties",
              ]
        }).code;
        try {
            halts(src);
        } catch (err) {
            if (err.node && err.node.start && err.node.end) {
                const lines = src.substring(err.node.start, err.node.end);
                const cols = codeFrameColumns(lines, { start: { line: 1, column: 1 } }, {
                    highlightCode: true,
                    message: "Fix this loop"
                })
                throw new Error(`Invalid or infinite loop detected.\n${cols}`);
            }
            throw err;
        }
    }

    compile(src) {
        src += `;
const __contract = new __contract_name();
const __metadata = {
    members: [],
    view: [],
    payable: []
}`;
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
                    //'dynamicImport',
                    //'exportDefaultFrom',
                    //'exportNamespaceFrom',
                    //'flow',
                    //'flowComments',
                    //'functionBind',
                    //'functionSent',
                    //'importMeta',
                    //'jsx',
                    'logicalAssignment',
                    'nullishCoalescingOperator',
                    'numericSeparator',
                    'objectRestSpread',
                    'optionalCatchBinding',
                    'optionalChaining',
                    ['pipelineOperator', { proposal: 'minimal' }],
                    'throwExpressions',
                ],
            },
            retainLines: true,
            minified: false,  
            plugins: contractPlugins,
            sourceMaps: true,
        });

        //console.log(result.code);
        return result.code;
    }

    patch(compiledSrc) {
        return Patch.patch(compiledSrc);
    }

    doRun(patchedSrc, ctx, info) {
        //console.log(patchedSrc)
        const f = new Function("__info", patchedSrc);
        return f.call(ctx, info);
    }
}

// TEST
/*
(function() {

    const src = `
        @contract class HelloWorld {
            hello() {
                console.log('Hello ' + msg.sender + ' at ' + now, setInterval());
            }
        }
    
    `
    
    const vm = new JsRunner();

    const compiledSrc = vm.compile(src);
    console.log('=== COMPILED ===');
    console.log(compiledSrc);

    const patchedSrc = vm.patch(compiledSrc);
    console.log('=== PATCHED ===');
    console.log(patchedSrc);

    console.log('=== RUN ===');
    run(compiledSrc, 'hello');

})();
*/