const utils = require('../helper/utils')
const sysContracts = require('../system')
const { getRunner, getContext, getGuard } = require('../vm')
const Invoker = require('./invoker')
const { isContract } = require('../statemanager')

class ContractInvoker extends Invoker {
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

    if (methodName === 'address') {
      return contractAddress
    } else if (methodName === 'balance') {
      return options.tools.balanceOf(contractAddress)
    } else if (methodName === 'deployedBy') {
      return options.tools.getCode(contractAddress).deployedBy
    }

    const { mode, src } = options.tools.getCode(contractAddress)
    const context = getContext(mode).for(invokeType, contractAddress, methodName, methodParams, options)

    let result

    const sysContract = sysContracts.get(contractAddress)
    if (sysContract) {
      result = sysContract.run(context, options)
    } else {
      const vm = getRunner(mode)
      const guard = getGuard(mode)(src)
      result = vm.run(src, { context, guard, info: options.info })
      const { tx } = options
      if (tx && tx.from && isContract(tx.from) && tx.to && tx.value) { // tx from contract
        const txContext = getContext(mode).for(invokeType, tx.payer, methodName, methodParams, options)
        txContext.transfer(tx.to, tx.value)
      }
    }

    return result
  }
}

module.exports = utils.newAndBind(ContractInvoker)
