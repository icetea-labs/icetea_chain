exports.patch = (src) => {
    return `
const global = void 0, process = void 0, Date = void 0, Math = void 0,
    setInterval = void 0, setTimeout = void 0;
const revert = (text) => {throw (text || "Transaction reverted")};
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

function __stater(name, initialValue) {
    if (name in __this) throw 'State name ' + name + ' is invalid. Choose another name.';
    __this[name] = {
        get: () => {
            return __this.hasState(name)?__this.getState(name):initialValue;
        },
        set: (value) => {
            return __this.setState(name, value);
        }
    }
}

function useState(e, name, d) {
    if (typeof e === 'string') {
        __stater(e, name);
    } else {
        const initialValue = d.initializer?d.initializer():(void 0);
        __stater(name, initialValue);
    }
}

function contract(t) {
    __c._i = Object.assign(new t(), __c._ev)
}
function on(ev) {
    return function (e, n) {
        __c._ev["__on_" + ev] = e[n]
    }
}
function pure(e, n) {
    __c._mk['view'].push(n);
}
function view(e, n) {
    __c._mk['view'].push(n);
}
function payable(e, n) {
    __c._mk['payable'].push(n);
}

typeof __info !== "undefined" && (__info = __c);

typeof msg !== "undefined" && msg.name && (__c._i[msg.name].apply(Object.assign(__c._i, this), msg.params));
`
}