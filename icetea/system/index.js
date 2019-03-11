const systemContracts = {
  'system.faucet': require('./Faucet')
}

exports.get = key => systemContracts[key]
exports.has = key => systemContracts.hasOwnProperty(key)
