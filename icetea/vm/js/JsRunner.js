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

var halts = require('halting-problem');
const Runner = require("../Runner");
const babel = require("@babel/core");
const {codeFrameColumns} = require("@babel/code-frame");

module.exports = mode => {
    const patch = require('./patch')(mode);
    return class extends Runner {
        ensureES5(src) {
            // Even current Node 11.9 --harmony does not support private method
            // (it supports private fields only).

            // Would remove this method when such things are supported natively by Node
            src = src.toString();
            return babel.transformSync(src, {
                plugins: [
                    "@babel/plugin-proposal-private-methods",
                    "@babel/plugin-proposal-class-properties",
                ]
            }).code;

        }

        verify(src) {
            src = super.verify(src);
            src = this.ensureES5(src);
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

            return src;
        }

        patch(compiledSrc) {
            return patch(compiledSrc);
        }

        doRun(patchedSrc, {context, guard, info}) {
            //console.log(patchedSrc);
            const f = new Function("__g", "__info", patchedSrc);
            return f.call(context, guard, info);
        }
    }
}
