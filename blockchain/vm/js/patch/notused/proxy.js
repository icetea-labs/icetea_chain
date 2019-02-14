exports.patch = src =>
`
const global = void 0, process = void 0, Date = void 0, Math = void 0,
    setInterval = void 0, setTimeout = void 0;
const revert = (text) => {throw new Error(text || "Transaction reverted")};
const require = (condition, text) => {if (!condition) revert(text)}
const assert = require;

const {msg, block} = this.getEnv();
const now = block.timestamp;

${src}

const __this = this;
const __c = {};
__c._i = new Proxy(Object.assign(__contract, __this), {
    get: (obj, prop) => {
        //console.log(prop)
        if (!__this[prop] && typeof obj[prop] !== "function" && __this.hasState(prop)) {
            return __this.getState(prop);
        }
        return obj[prop];
    },
    set: (obj, prop, value) => {
        if (typeof obj[prop] !== "function") {
            __this.setState(prop, value);
            return true;
        }
        obj[prop] = value;
        return true;
    }
});

typeof __info !== "undefined" && Object.assign(__info, __c);

if (typeof msg !== "undefined" && msg && msg.name && __c._i[msg.name]) {
    if (typeof __c._i[msg.name] === "function") {
        const x = __c._i[msg.name].apply(__c._i, msg.params || []);
        return x;
    }
    return __c._i[msg.name];
}
`