const _ = require('lodash');

module.exports = (tx, block, stateTable, {address, fname, fparams}) => {
    const msg = _.cloneDeep(tx);
    msg.name = fname;
    msg.params = fparams;
    msg.sender = msg.from; // alias


    const theBlock = _.cloneDeep(block);
    const state = _.cloneDeep(stateTable[address].state || {});
    const balance = state.balance || 0;

    const ctx = {
        address,
        balance,
        getEnv: () => ({msg, block: theBlock}),
        transfer: (to, value) => {
            this.decBalance(address, value, stateTable);
            this.incBalance(to, value, stateTable);
        },
        _state: {},
        hasState: (key) => {
            return ctx._state.hasOwnProperty(key);
        },
        getState: (key) => {
            return ctx._state.hasOwnProperty(key) ? ctx._state[key] : state[key];
        },
        setState: (key, value) => {
            const old = ctx.getState(key);
            ctx._state[key] = value;
            return old;
        }
    }

    return ctx;
}