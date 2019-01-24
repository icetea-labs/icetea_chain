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
const babelPlugins = {
    "plugins": [
        ["@babel/plugin-proposal-decorators", { "legacy": true }],
        ["@babel/plugin-proposal-class-properties", { "loose" : true }]
      ]
};

const Patch = require('./patch/');

module.exports = class JsRunner extends Runner {
    compile(src) {
        return babel.transform(src, babelPlugins).code;
    }
    
    patch(compiledSrc) {
        return Patch.patch(compiledSrc);
    }
    
    doRun(compiledSrc, ctx) {
        console.log(compiledSrc)
        const f = new Function(compiledSrc);
        f.call(ctx);
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