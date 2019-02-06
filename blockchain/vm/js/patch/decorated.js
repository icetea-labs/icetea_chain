module.exports = src => `
'use strict';
const global = void 0, globalThis = void 0, process = void 0, Date = void 0, Math = void 0,
    setInterval = void 0, setTimeout = void 0, setImmediate = void 0;
const revert = (text) => {throw new Error(text || "Transaction reverted")};
const require = (condition, text) => {if (!condition) revert(text)}
const assert = require;

const {msg, block} = this.getEnv();
const now = block.timestamp;

assert(typeof msg !== "undefined" && msg, "Invalid or corrupt transaction data");
require(msg.name, "Method name not specified");

const __guard = __g;

${src}

if (["__on_deployed", "__on_received"].includes(msg.name) && !(msg.name in __contract)) {
    // call event methods but contract does not have one
    return;
}
require(["__info", "address", "balance"].includes(msg.name) || msg.name in __contract, "Method " + msg.name + " does not exist");

const __this = this;
const __c = {
    _i: Object.assign(__contract, __this),
    _m: __metadata
};

msg.name === "__info" && typeof __info !== "undefined" && Object.assign(__info, __c);

if (typeof __c._i[msg.name] === "function") {
    const hasDeco = (d) => {
        if (["__on_deployed", "__on_received"].includes(msg.name)) return true; // FIXME
        if (!__metadata[msg.name].decorators) {
            return false;
        }
        return __metadata[msg.name].decorators.includes(d);
    }
    if (!hasDeco(msg.callType)) {
        revert("Method " + msg.name + " is not decorated as @" + msg.callType + " and cannot be invoked in such mode");
    }
    return __c._i[msg.name].apply(__c._i, msg.params || []);
}
return __c._i[msg.name];
`