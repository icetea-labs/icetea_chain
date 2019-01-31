const Runner = require("../Runner");
const patch = require('./patch');

module.exports = class extends Runner {
    patch(wasmBuffer) {
        return patch(wasmBuffer);
    }

    doRun(patcher, ctx, info) {
        return patcher(ctx, info);
    }
}
