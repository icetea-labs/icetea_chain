const utils = require('../helper/utils')
const sysContracts = require('../system')
const { getRunner, getContext, getGuard } = require('../vm')
const Invoker = require('./invoker')

class LibraryInvoker extends Invoker {
  /**
     * Invoke a contract method.
     * @param {string} invokeType 'transaction', 'view', or 'pure'.
     * @param {string} contractAddress address of the contract.
     * @param {string} methodName name of the method.
     * @param {Array} methodParams optional, params to be passed to method.
     * @param {{tx, block, stateAccess, tools}} options additional options, depending on invokeType.
     */
  invoke (invokeType, contractAddress, methodName, methodParams, options) {
    if (!['pure', 'view', 'transaction', 'metadata'].includes(invokeType)) {
      throw new Error(`Invalid invoke type ${invokeType}. Must be 'pure', 'view', or 'transaction'.`)
    }

    const { origin } = options

    if (methodName === 'address') {
      return contractAddress
    } else if (methodName === 'balance') {
      return options.tools.balanceOf(contractAddress)
    } else if (methodName === 'deployedBy') {
      return options.tools.getCode(contractAddress).deployedBy
    }

    const { mode, src } = options.tools.getCode(contractAddress)
    const context = getContext(mode).for(invokeType, origin, methodName, methodParams, options)

    let result

    const sysContract = sysContracts.get(contractAddress)
    if (sysContract) {
      result = sysContract.run(context, options)
    } else {
      const vm = getRunner(mode)
      const guard = getGuard(mode)(src)
      result = vm.run(src, { context, guard, info: options.info })
    }

    return result
  }
}

module.exports = utils.newAndBind(LibraryInvoker)
