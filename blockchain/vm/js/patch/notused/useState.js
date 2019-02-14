exports.patch = (src) => {
    return `
const global = void 0, process = void 0, Date = void 0, Math = void 0,
    setInterval = void 0, setTimeout = void 0;
const revert = (text) => {throw new Error(text || "Transaction reverted")};
const require = (condition, text) => {if (!condition) revert(text)}
const assert = require;

const {msg, block} = this.getEnv();
const now = block.timestamp;

${src}

const __this = this;
const __c = {
    _i: Object.assign(__contract, __this)
};

function useState(e, name, d) {
    //console.log("useState")
    const initialValue = d.initializer?d.initializer():(void 0);
    delete d.initializer;
    delete d.writable;
    d.configurable = false;
    d.get = () => __this.hasState(name)?__this.getState(name):initialValue;
    d.set = value => __this.setState(name, value);
}

typeof __info !== "undefined" && Object.assign(__info, __c);

if (typeof msg !== "undefined" && msg && msg.name && __c._i[msg.name]) {
    if (typeof __c._i[msg.name] === "function") {
        return __c._i[msg.name].apply(__c._i, msg.params || []);
    }
    return __c._i[msg.name];
}
`
}