const SysContractNames = require('./sysconnames')

const systemContracts = Object.keys(SysContractNames).reduce((prev, key) => {
  prev[SysContractNames[key]] = exports[key] = require('./' + key.toLowerCase())
  return prev
}, {})

exports.all = () => Object.keys(systemContracts)
exports.get = key => systemContracts[key]
exports.has = key => Object.prototype.hasOwnProperty.call(systemContracts, key)

exports.run = (key, context, options) => {
  if (!Object.prototype.hasOwnProperty.call(systemContracts, key)) {
    throw new Error(`System contract ${key} cannot be found.`)
  }

  return systemContracts[key].run.call(context, context, options)
}
