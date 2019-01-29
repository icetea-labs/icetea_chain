module.exports = src => `
const global = void 0, process = void 0, Date = void 0, Math = void 0,
    setInterval = void 0, setTimeout = void 0;
const revert = (text) => {throw new Error(text || "Transaction reverted")};
const require = (condition, text) => {if (!condition) revert(text)}
const assert = require;

const {msg, block} = this.getEnv();
const now = block.timestamp;

assert(typeof msg !== "undefined" && msg, "Invalid or corrupt transaction data");
require(msg.name, "Method name not specified");

${src}

require(msg.name == "__info" || msg.name in __contract, "Method " + msg.name + " does not exist");

const __this = this;
const __c = {
    _i: Object.assign(__contract, __this),
    _m: __metadata
};

msg.name === "__info" && typeof __info !== "undefined" && Object.assign(__info, __c);

if (typeof __c._i[msg.name] === "function") {
    if (msg.callType === "payable" && !__metadata.payable.includes(msg.name)) {
        revert("Function is not payable and cannot receive");
    }
    if (msg.callType === "view" && !__metadata.view.includes(msg.name)) {
        revert("Function not marked as view and must be invoked by sending a transaction");
    }
    return __c._i[msg.name].apply(__c._i, msg.params || []);
}
return __c._i[msg.name];

`