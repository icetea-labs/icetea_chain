module.exports = src => `
'use strict';
const global = void 0, globalThis = void 0, process = void 0, Math = void 0,
    setInterval = void 0, setTimeout = void 0, setImmediate = void 0;
const revert = text => {throw new Error(text || "Transaction reverted")};
const require = (condition, text) => {if (!condition) revert(text)}
const assert = require;

const {msg, block, tags: __tags, loadContract} = this.getEnv();
const now = block?block.timestamp:0;
//const now = ["view", "pure", "dummy"].includes(msg.callType)?Date.now()/1000|0:block.timestamp;
const Date = void 0;

const emitEvent = function(eventName, eventData, indexes = []) {
    if (eventName === "EventNames") {
        revert("Event name cannot be 'EventNames'");
    }
    if (eventName.includes("|")) {
        revert("Event name cannot contain '|' character")
    }
    if (!__tags.EventNames) __tags.EventNames = "|";
    if (__tags.EventNames.includes("|" + eventName + "|")) {
        revert("Event " + eventName + " was already emit");
    }
    __tags.EventNames += eventName + "|";
    indexes.forEach(indexedKey => {
        if (typeof indexedKey !== "string") {
            revert("Event's indexed key must be string");
        }
        //if (typeof eventData[indexedKey] === "undefined") {
        //    revert("Event's indexed value is not provided");
        //}
        __tags[eventName + "." + indexedKey] = String(JSON.stringify(eventData[indexedKey]));
        delete eventData[indexedKey];
    });
    __tags[eventName] = String(JSON.stringify(eventData));
}

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