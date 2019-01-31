const _ = require('lodash');

exports.contextForWrite = (tx, block, stateTable, {address, fname, fparams}) => {
    const state = stateTable[address].state || {};
    const balance = state.balance || 0;

    const ctx = {
        getMsgName: () => fname || tx.data.name,
        getAddress: () => address || tx.to,
        getBalance: () => balance,
        getSender: () => tx.sender,
        getTimestamp: () => block.timestamp,
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

exports.contextForView = exports.contextForView = (stateTable, address, name, params) => {
    const state = _.cloneDeep(stateTable[address].state || {});
    const balance = state.balance || 0;

    const ctx = {
        getMsgName: () => name,
        getAddress: () => address,
        getBalance: () => balance,
        getSender: () => "",
        getTimestamp: () => 0,
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
    const ctx = {
        getMsgName: () => name,
        getAddress: () => address,
        getBalance: () => 0,
        getSender: () => "",
        getTimestamp: () => 0,
        getState: () => {
            throw new Error("Cannot access state inside a pure function");
        },
        setState: () => {
            throw new Error("Cannot access state inside a pure function");
        }
    }

    return ctx;
};

exports.dummyContext = {
    getMsgName: () => "__info",
    getAddress: () => "",
    getBalance: () => 0,
    getSender: () => "",
    getTimestamp: () => 0,
    getState: () => "",
    setState: () => undefined
};