module.exports = {
    hello: () => {
        console.log("Hello " + msg.sender);
    },

    _default: () => {
        console.log("fallback function!")
    }
}


module.exports[module.exports[msg.name] ? msg.name : "_default"].apply(this, msg.params);