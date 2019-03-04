const utils = require('./helper/utils')
const { getRunner, getContext, getGuard } = require('./vm')

class ContractInvoker {
  /**
     * Invoke a contract method.
     * @param {string} invokeType 'transaction', 'view', or 'pure'.
     * @param {string} contractAddress address of the contract.
     * @param {string} methodName name of the method.
     * @param {Array} methodParams optional, params to be passed to method.
     * @param {{block, stateTable}} options additional options, depending on invokeType.
     */
  async invoke (invokeType, contractAddress, methodName, methodParams, options) {
    if (!['pure', 'view', 'transaction', 'metadata'].includes(invokeType)) {
      throw new Error(`Invalid invoke type ${invokeType}. Must be 'pure', 'view', or 'transaction'.`)
    }

    if (methodName === 'address') {
      return contractAddress
    } else if (methodName === 'balance') {
      return options.stateTable[contractAddress].balance || 0
    }

    const { mode, src } = getContractInfo(contractAddress, options.stateTable)
    const vm = getRunner(mode)
    const context = getContext(mode).for(invokeType, contractAddress, methodName, methodParams, options)
    const guard = getGuard(mode)(src)
    const result = await vm.run(src, { context, guard })

    if (invokeType === 'transaction') {
      // save back the state
      options.stateTable[contractAddress].state =
        Object.assign(options.stateTable[contractAddress].state || {}, context._state)

      return [result, context.getEnv().tags]
    }

    return result
  }

  /**
     * Query contract metadata.
     * @param {string} contractAddress
     */
  queryMetadata (contractAddress, options) {
    return this.invoke('metadata', contractAddress, undefined, undefined, options)
  }

  /**
     * Invoke a 'pure' method. Pure method does not access contract state.
     * @param {string} contractAddress address of the contract.
     * @param {string} methodName name of the method.
     * @param {*} methodParams optional, params to be passed to method.
     * @param {{from: string}} options additional options.
     */
  invokePure (contractAddress, methodName, methodParams, options) {
    return this.invoke('pure', contractAddress, methodName, methodParams, options)
  }

  /**
     * Invoke a 'view' method. 'View' method does not change contract state.
     * @param {string} contractAddress address of the contract.
     * @param {string} methodName name of the method.
     * @param {*} methodParams optional, params to be passed to method.
     * @param {{from: string}} options additional options.
     */
  invokeView (contractAddress, methodName, methodParams, options) {
    return this.invoke('view', contractAddress, methodName, methodParams, options)
  }

  /**
     * Invoke a 'transaction' method. Used for calling internally.
     * @param {*} contractAddress address of the contract.
     * @param {*} methodName name of the method.
     * @param {*} methodParams optional, params to be passed to method.
     * @param {{tx, block, stateTable}} options additional options.
     */
  invokeUpdate (contractAddress, methodName, methodParams, options) {
    return this.invoke('transaction', contractAddress, methodName, methodParams, options)
  }

  /**
     * Invoke a transaction broadcast by client. Transaction can change state, balance, and emit events.
     * @param {{tx: {to: string, data: {name: string, params: Array}}, block, stateTable}} options
     */
  invokeTx (options) {
    const { tx } = options
    return this.invokeUpdate(tx.to, tx.data.name, tx.data.params, options)
  }

  deployContract (tx, stateTable) {
    // make new address for smart contract
    let contractAddress = makeContractAddress(stateTable, tx.from)
    tx.to = contractAddress

    // analyze and compile source
    const mode = tx.data.mode
    const src = Buffer.from(tx.data.src, 'base64')
    const deployedBy = tx.from
    const vm = getRunner(mode)
    const compiledSrc = vm.compile(src)
    const meta = vm.analyze(compiledSrc) // linter & halt-problem checking included

    // save contract src and data to state
    const state = {
      balance: 0,
      mode,
      deployedBy,
      src: compiledSrc
    }
    if (meta) {
      state.meta = meta
    }
    utils.prepareState(contractAddress, stateTable, state)

    return contractAddress
  }
}

/**
   * Get contract information. Throw if not a valid contract.
   * @private
   * @returns {{state: any, mode: number, src: string|Buffer}} contract data.
   */
function getContractInfo (addr, stateTable) {
  if (stateTable[addr] && stateTable[addr].src) {
    return stateTable[addr]
  }
  throw new Error('The address supplied is not a deployed contract')
}

function makeContractAddress (stateTable, deployedBy) {
  // make new address for smart contract
  // should be deterministic

  // TODO: change this

  const count = Object.keys(stateTable).reduce((t, k) => (
    (k.startsWith('contract_') && k.endsWith(deployedBy)) ? (t + 1) : t
  ), 0)

  return 'contract_' + count + '_' + deployedBy
}

module.exports = utils.newAndBind(ContractInvoker)
