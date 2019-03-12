const systemContracts = {
  'system.faucet': require('./Faucet')
}

exports.all = () => Object.keys(systemContracts)
exports.get = key => systemContracts[key]
exports.has = key => systemContracts.hasOwnProperty(key)

exports.run = (key, context) => {
  if (!systemContracts.hasOwnProperty(key)) {
    throw new Error(`System contract ${key} cannot be found.`)
  }

  return systemContracts[key].run.call(context, context)
}
