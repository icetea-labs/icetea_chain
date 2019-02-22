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

exports.getAllPropertyNames = function(obj) {
    var props = [];

    do {
        Object.getOwnPropertyNames(obj).forEach(prop => {
            if (!props.includes(prop)) {
                props.push(prop);
            }
        });
    } while ((obj = Object.getPrototypeOf(obj)) && obj != Object.prototype);

    //console.log(props);
    return props;
}

exports.emitEvent = function(emitter, tags, eventName, eventData, indexes = []) {
    emitter = emitter || "system";
    tags = tags || {};

    if (eventName === "EventNames") {
        revert("Event name cannot be 'EventNames'");
    }
    if (eventName.includes("|")) {
        revert("Event name cannot contain '|' character")
    }
    if (!tags.EventNames) tags.EventNames = "|";
    if (tags.EventNames.includes("|" + eventName + "|")) {
        revert("Event " + eventName + " was already emit");
    }
    tags.EventNames += emitter + "." + eventName + "|";
    indexes.forEach(indexedKey => {
        if (typeof indexedKey !== "string") {
            revert("Event's indexed key must be string");
        }
        //if (typeof eventData[indexedKey] === "undefined") {
        //    revert("Event's indexed value is not provided");
        //}
        tags[eventName + "." + indexedKey] = String(JSON.stringify(eventData[indexedKey]));
        delete eventData[indexedKey];
    });
    tags[eventName] = String(JSON.stringify(eventData));

    return tags;
}