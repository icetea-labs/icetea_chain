const _ = require('lodash');
const utils = require('../helper/utils');

exports.contextForWrite = (tx, block, stateTable, {address, fname, fparams}) => {
    const msg = _.cloneDeep(tx);
    msg.name = fname;
    msg.params = fparams;
    msg.sender = msg.from; // alias
    msg.callType = (msg.value > 0)?"payable":"update";


    const theBlock = _.cloneDeep(block);
    const state = stateTable[address].state || {};
    const balance = state.balance || 0;

    const ctx = {
        address,
        balance,
        getEnv: () => ({msg, block: theBlock}),
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

    return ctx;
}

exports.contextForView = (stateTable, address, name, params) => {
    const msg = {};
    msg.name = name;
    msg.params = params;
    msg.callType = "view";

    const state = _.cloneDeep(stateTable[address].state || {});
    const balance = state.balance || 0;

    const ctx = {
        address,
        balance,
        getEnv: () => ({msg, block: {}}),
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

    return ctx;
}

exports.contextForPure = (address, name, params) => {
    const msg = {};
    msg.name = name;
    msg.params = params;
    msg.callType = "pure";

    const ctx = {
        address,
        getEnv: () => ({msg, block: {}}),
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

    return ctx;
}

exports.dummyContext = {
    getEnv: () => ({msg: {callType: "dummy", name: "__info"}, block:{}}),
    getState: () => undefined,
    setState: () => undefined
}