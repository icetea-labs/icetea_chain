const systemContracts = {
  'system.echo_bot': require('./echobot'),
  'system.alias': require('./alias'),
  'system.faucet': require('./faucet')
}

exports.all = () => Object.keys(systemContracts)
exports.get = key => systemContracts[key]
exports.has = key => systemContracts.hasOwnProperty(key)

exports.run = (key, context, options) => {
  if (!systemContracts.hasOwnProperty(key)) {
    throw new Error(`System contract ${key} cannot be found.`)
  }

  return systemContracts[key].run.call(context, context, options)
}
