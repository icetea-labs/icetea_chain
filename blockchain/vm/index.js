//exports.getRunner = require('./js');
//exports.Context = require('./js/Context');

//exports.getRunner = require('./wasm');
//exports.Context = require('./wasm/Context');

const getRunner = mode => {
    if (mode === 2) {
        return require('./wasm');
    }
    return require('./js')(mode);
}

const getContext = mode => {
    if (mode === 2) {
        return require('./wasm/Context');
    }
    return require('./js/Context');
}

module.exports = {getRunner, getContext};