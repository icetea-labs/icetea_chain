const msg = this.getEnv().msg;
const contract = {
    '__on_deployed': function () {
        this.setState('owner', msg.sender);
    },
    'getValue': function () {
        return this.getState('value');
    },
    'setValue': function (value) {
        if (this.getState('owner') !== msg.sender) {
            throw new Error('Only contract owner can set value');
        }
        if (!msg.params || !msg.params.length) {
            throw new Error('Invalid value');
        }
        this.setState('value', value);
    }
}

// call requested function
if (contract[msg.name]) {
    return contract[msg.name].apply(this, msg.params);
} else {
    // call unsupported function -> inform caller our function list
    return {
        'getValue': { decorators: ['view'] },
        'setValue': { decorators: ['transaction'] }
    }
}