const { getRunner } = require('./vm')

class Invoker {
  /**
     * Invoke a contract method.
     * @param {string} invokeType 'transaction', 'view', or 'pure'.
     * @param {string} contractAddress address of the contract.
     * @param {string} methodName name of the method.
     * @param {Array} methodParams optional, params to be passed to method.
     * @param {{tx, block, stateAccess, tools}} options additional options, depending on invokeType.
     */
  invoke (invokeType, contractAddress, methodName, methodParams, options) {
    throw new Error('Implement me.')
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
     * @param {{tx, block, stateAccess, tools}} options additional options.
     */
  invokeUpdate (contractAddress, methodName, methodParams, options) {
    return this.invoke('transaction', contractAddress, methodName, methodParams, options)
  }

  /**
     * Invoke a transaction broadcasted by client. Transaction can change state, balance, and emit events.
     * @param {{tx: {to: string, data: {name: string, params: Array}}, block, stateAccess, tools}} options
     */
  invokeTx (options) {
    const { tx } = options
    return this.invokeUpdate(tx.to, tx.data.name, tx.data.params, options)
  }

  prepareContract (tx) {
    // analyze and compile source
    const mode = tx.data.mode
    const src = Buffer.from(tx.data.src, 'base64')
    const deployedBy = tx.from
    const vm = getRunner(mode)
    let compiledSrc = vm.compile(src)

    const meta = vm.analyze(compiledSrc) // linter & halt-problem checking included

    // save contract src and data to state
    const state = {
      // balance: 0,
      // mode,
      deployedBy,
      src: compiledSrc
    }
    if (mode) {
      state.mode = mode
    }
    if (meta) {
      state.meta = meta
    }

    return state
  }
}

module.exports = Invoker
