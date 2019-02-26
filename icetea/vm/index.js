const { ContractMode } = require('../enum')

exports.getRunner = mode => (mode === ContractMode.WASM ? require('./wasm') : require('./js')(mode))
exports.getContext = mode => require(mode === ContractMode.WASM ? './wasm/Context' : './js/Context')
exports.getGuard = mode => (mode === ContractMode.WASM ? () => undefined : (require('./js/guard')(mode)))
