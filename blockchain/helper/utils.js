exports.incBalance = (addr, delta, stateTable) => {
    const t = stateTable;
    t[addr] = t[addr] || {balance: 0};
    t[addr].balance += parseFloat(delta) || 0;
}

exports.decBalance = (addr, delta, stateTable) => {
    exports.incBalance(addr, -delta, stateTable);
}