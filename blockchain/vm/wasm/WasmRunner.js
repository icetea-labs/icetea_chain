const Runner = require("../Runner");
const patch = require('./patch');

module.exports = class extends Runner {
    patch(wasmBuffer) {
        return patch(wasmBuffer);
    }

    doRun(patcher, {context}) {
        return patcher(context);
    }
}
