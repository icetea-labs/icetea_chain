module.exports = (mode = 1) => {
    if (mode === 1) {
        return new (require('./DecoratedRunner')(mode))();
    }

    return new (require('./JsRunner')(mode))();
}