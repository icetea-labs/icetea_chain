module.exports = mode => {
    if (mode === 1) {
        return require('./decorated');
    }
    return require('./raw');
}
