module.exports = src => `
'use strict';
const global = void 0, globalThis = void 0, process = void 0, Date = void 0, Math = void 0,
    setInterval = void 0, setTimeout = void 0, setImmediate = void 0;
const revert = text => {throw new Error(text || "Transaction reverted")};
const require = (condition, text) => {if (!condition) revert(text)}
const assert = require;

const {msg, block, tags: __tags, loadContract} = this.getEnv();
const now = block ? block.timestamp : 0;

assert(typeof msg !== "undefined" && msg, "Invalid or corrupt transaction data");
require(msg.name, "Method name not specified");

const __guard = __g;

${src}

if (["__on_deployed", "__on_received"].includes(msg.name) && !(msg.name in __contract)) {
    // call event methods but contract does not have one
    return;
}
require(["__metadata", "address", "balance"].includes(msg.name) || msg.name in __contract, "Method " + msg.name + " does not exist");

Object.defineProperties(__contract, Object.getOwnPropertyDescriptors(this));
const __c = {
    instance: __contract,
    meta: __metadata
};

if (msg.name === "__metadata") {
    return __c;
}

if (typeof __c.instance[msg.name] === "function") {
    const isValidCallType = (d) => {
        if (["__on_deployed", "__on_received"].includes(msg.name)) return true; // FIXME
        if (!__metadata[msg.name].decorators) {
            return false;
        }
        if (d === "transaction" && __metadata[msg.name].decorators.includes("payable")) {
            return true;
        } 
        return __metadata[msg.name].decorators.includes(d);
    }
    if (!isValidCallType(msg.callType)) {
        revert("Method " + msg.name + " is not decorated as @" + msg.callType + " and cannot be invoked in such mode");
    }
    return __c.instance[msg.name].apply(__c.instance, msg.params || []);
}
return __c.instance[msg.name];
`
