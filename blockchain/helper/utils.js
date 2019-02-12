exports.prepareState = (addr, stateTable, initialValues) => {
    if (!stateTable[addr]) {
        stateTable[addr] = {};
    }

    if (typeof stateTable[addr].balance === "undefined") {
        let balance = 0;

        Object.defineProperty(stateTable[addr], "balance", {
            enumerable: true,
            get() {
                return balance;
            },
            set(value) {
                if (value < 0) {
                    throw new Error("Balance cannot be negative")
                }
                balance = value;
            }
        })
    }

    if (initialValues) {
        Object.assign(stateTable[addr], initialValues);
    }
    
    return stateTable[addr];
}

exports.incBalance = (addr, delta, stateTable) => {
    delta = parseFloat(delta) || 0 ;
    const state = exports.prepareState(addr, stateTable);
    if (state.balance + delta < 0){
        throw new Error("Not enough balance");
    }
    state.balance += delta;
}

exports.decBalance = (addr, delta, stateTable) => {
    exports.incBalance(addr, -delta, stateTable);
}