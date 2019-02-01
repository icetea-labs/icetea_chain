module.exports = src => `
'use strict';
const global = void 0, process = void 0, Date = void 0, Math = void 0,
    setInterval = void 0, setTimeout = void 0;
const revert = (text) => {throw new Error(text || "Transaction reverted")};
const require = (condition, text) => {if (!condition) revert(text)}
const assert = require;

const {msg, block} = this.getEnv();
const now = block.timestamp;

assert(typeof msg !== "undefined" && msg, "Invalid or corrupt transaction data");
require(msg.name, "Method name not specified");

const __guard = __g;

${src}
if (["__on_deployed", "__on_received"].includes(msg.name) && !(msg.name in __contract)) return;
require(msg.name == "__info" || msg.name in __contract, "Method " + msg.name + " does not exist");
__metadata.payable.push("__on_deployed"); // FIXME
__metadata.payable.push("__on_received"); // FIXME
const __this = this;
const __c = {
    _i: Object.assign(__contract, __this),
    _m: __metadata
};

msg.name === "__info" && typeof __info !== "undefined" && Object.assign(__info, __c);

if (typeof __c._i[msg.name] === "function") {
    if (msg.callType === "payable" && !__metadata.payable.includes(msg.name)) {
        revert("Function " + msg.name + " is not payable and cannot receive");
    }
    if (msg.callType === "view" && !__metadata.view.includes(msg.name)) {
        revert("Function " + msg.name + " not marked as view and must be invoked by sending a transaction");
    }
    return __c._i[msg.name].apply(__c._i, msg.params || []);
}
return __c._i[msg.name];

`