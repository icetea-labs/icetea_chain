exports.patch = (src) => {
    return `
const global = void 0, process = void 0, Date = void 0, Math = void 0,
    setInterval = void 0, setTimeout = void 0;
const revert = (text) => {throw new Error(text || "Transaction reverted")};
const require = (condition, text) => {if (!condition) revert(text)}
const assert = require;

const {msg, block} = this.getEnv();
const now = block.timestamp;

const __this = this;
const __c = {
    _ev: {},
    _mk: {}
}

${src}

function __staterList(obj) {
    obj.forEach((value, key) => {
        __stater(key, value);
    });
}
function __stater(name, initialValue) {
    if (name in __this) throw new Error('State name ' + name + ' is invalid. Choose another name.');
    const get = () => __this.hasState(name)?__this.getState(name):initialValue;
    const set = value => __this.setState(name, value);
    const add = delta => __this.setState(name, (get() || 0) + delta);
    const sub = delta => add(-delta);
    const inc = () => add(1);
    const dec = () => add(-1);
    const mul = x => __this.setState(name, (get() || 0) * x);
    const div = x => mul(1/x);
    const change = callback => __this.setState(name, callback(get()));
    __this[name] = {get, set, add, sub, inc, dec, mul, div, change};
}

function useState(e, name, d) {
    if (typeof d === 'undefined') {
        if (typeof e === 'string') {
            __stater(e, name);
        } else {
            __staterList(e);
        }
    } else {
        const initialValue = d.initializer?d.initializer():(void 0);
        __stater(name, initialValue);
    }
}

function contract(t) {
    __c._i = Object.assign(new t(), __c._ev, __this)
}
function on(ev) {
    return function (e, n) {
        __c._mk[ev] = __c._mk[ev] || [];
        __c._mk[ev].push(n);
        __c._ev["__on_" + ev] = e[n]
    }
}
function pure(e, n) {
    __c._mk['pure'].push(n);
}
function view(e, n) {
    __c._mk['view'].push(n);
}
function payable(e, n) {
    __c._mk['payable'].push(n);
}

typeof __info !== "undefined" && Object.assign(__info, __c);

if (typeof msg !== "undefined" && msg && msg.name && __c._i[msg.name]) {
    if (typeof __c._i[msg.name] === "Function") {
        return __c._i[msg.name].apply(__c._i, msg.params);
    }
    return __c._i[msg.name];
}
`
}