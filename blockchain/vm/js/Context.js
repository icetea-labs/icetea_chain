const _ = require('lodash');
const utils = require('../../helper/utils');

exports.contextForWrite = (tx, block, stateTable, {address, fname, fparams}) => {
    let msg = _.cloneDeep(tx);
    msg.name = fname;
    msg.params = fparams;
    msg.sender = msg.from; // alias
    msg.callType = (msg.value > 0)?"payable":"transaction";
    msg = Object.freeze(msg);


    const theBlock = Object.freeze(_.cloneDeep(block));
    const state = Object.freeze(stateTable[address].state || {});
    const balance = stateTable[address].balance || 0;

    const ctx = {
        address,
        balance,
        getEnv: () => Object.freeze({msg, block: theBlock}),
        transfer: (to, value) => {
            ctx.balance -= value;
            utils.decBalance(address, value, stateTable);
            utils.incBalance(to, value, stateTable);
        },
        _state: {},
        hasState: (key) => {
            return ctx._state.hasOwnProperty(key) || state.hasOwnProperty(key);
        },
        getState: (key, defVal) => {
            return ctx._state.hasOwnProperty(key) ? ctx._state[key] : (state.hasOwnProperty(key)?state[key]:defVal);
        },
        setState: (key, value) => {
            const old = ctx.getState(key);
            ctx._state[key] = value;
            return old;
        }
    }

    return Object.freeze(ctx);
}

exports.contextForView = (stateTable, address, name, params) => {
    const msg = new Proxy({name, params, callType: "view"}, {
        get(target, prop) {
            if (Object.keys(msg).includes(prop) && !["name", "params", "callType"].includes(prop)) {
                throw new Error ("Cannot access msg." + prop + " when calling a @view function")
            }
            return Reflect.get(target, prop);
        }
    })

    const state = _.cloneDeep(stateTable[address].state || {});
    const balance = stateTable[address].balance || 0;

    const ctx = {
        address,
        balance,
        getEnv: () => ({msg}),
        transfer: () => {
            throw new Error("Cannot transfer inside a view function");
        },
        hasState: (key) => {
            return state.hasOwnProperty(key);
        },
        getState: (key) => {
            return state[key];
        },
        setState: () => {
            throw new Error("Cannot change state inside a view function");
        }
    }

    return Object.freeze(ctx);
}

exports.contextForPure = (address, name, params) => {
    const msg = {};
    msg.name = name;
    msg.params = params;
    msg.callType = "pure";

    const ctx = {
        address,
        get balance() {
            throw new Error("Cannot view balance a pure function");
        },
        getEnv: () => ({msg}),
        transfer: () => {
            throw new Error("Cannot transfer inside a pure function");
        },
        hasState: () => {
            throw new Error("Cannot access state inside a pure function");
        },
        getState: () => {
            throw new Error("Cannot access state inside a pure function");
        },
        setState: () => {
            throw new Error("Cannot access state inside a pure function");
        }
    }

    return Object.freeze(ctx);
}

exports.dummyContext = Object.freeze({
    getEnv: () => ({msg: {callType: "dummy", name: "__info"}}),
    getState: () => undefined,
    setState: () => undefined
});