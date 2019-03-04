const _ = require('lodash')
const utils = require('./helper/utils')
const config = require('./config')
const { getRunner, getContext, getGuard } = require('./vm')

module.exports = class ContractExecutor {
  constructor (stateTable, lastBlock) {
    this.stateTable = stateTable || {}
    this.lastBlock = lastBlock
  }

  /**
     * Get contract information. Throw if not a valid contract.
     * @private
     * @returns {{state: any, mode: number, src: string|Buffer}} contract data.
     */
  getContractInfo (addr, stateTable = this.stateTable) {
    if (stateTable[addr] && stateTable[addr].src) {
      return stateTable[addr]
    }
    throw new Error('The address supplied is not a deployed contract')
  }

  /**
     * Invoke a contract method.
     * @param {string} invokeType 'transaction', 'view', or 'pure'.
     * @param {string} contractAddress address of the contract.
     * @param {string} methodName name of the method.
     * @param {Array} methodParams optional, params to be passed to method.
     * @param {*} options additional options, depending on invokeType.
     */
  async invoke (invokeType, contractAddress, methodName, methodParams, options) {
    if (!['pure', 'view', 'transaction', 'metadata'].includes(invokeType)) {
      throw new Error(`Invalid invoke type ${invokeType}. Must be 'pure', 'view', or 'transaction'.`)
    }

    if (methodName === 'address') {
      return contractAddress
    } else if (methodName === 'balance') {
      return utils.balanceOf(contractAddress, options.stateTable)
    }

    const { mode, src } = this.getContractInfo(contractAddress, options.stateTable)
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
  queryMetadata (contractAddress) {
    return this.invoke('metadata', contractAddress, undefined, undefined, {stateTable: this.stateTable})
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
  invokeView (contractAddress, methodName, methodParams, options = {}) {
    options.stateTable = options.stateTable || this.stateTable
    options.block = this.lastBlock
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

  async execTx (tx) {
    // clone the state so that we could revert on exception
    const tmpStateTable = _.cloneDeep(this.stateTable)

    const result = await this.doExecTx({
      tx,
      block: this.lastBlock,
      stateTable: tmpStateTable
    })

    // merge state if execution successful (no error thrown)
    utils.mergeStateTables(this.stateTable, tmpStateTable)

    return result || []
  }

  makeContractAddress (deployedBy) {
    // make new address for smart contract
    // should be deterministic

    // TODO: change this

    const count = Object.keys(this.stateTable).reduce((t, k) => (
      (k.startsWith('contract_') && k.endsWith(deployedBy)) ? (t + 1) : t
    ), 0)

    return 'contract_' + count + '_' + deployedBy
  }

  /**
     * @private
     */
  async doExecTx (options) {
    const { tx, stateTable } = options
    let result

    // deploy contract
    if (tx.isContractCreation()) {
      // make new address for smart contract
      let contractAddress = this.makeContractAddress(tx.from)
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

      // call constructor
      result = this.invokeUpdate(
        contractAddress,
        '__on_deployed',
        tx.data.params,
        options
      ).then(r => {
        // when deploy contract, always return the contract address
        r[0] = contractAddress
        return r
      })
    }

    // call contract
    if (tx.isContractCall()) {
      if (['constructor', '__on_received', '__on_deployed', 'getState', 'setState', 'getEnv'].includes(tx.data.name)) {
        throw new Error('Calling this method directly is not allowed')
      }
      result = this.invokeTx(options)
    }

    // process value transfer
    utils.decBalance(tx.from, tx.value + tx.fee, stateTable)
    utils.incBalance(tx.to, tx.value, stateTable)
    utils.incBalance(config.feeCollector, tx.fee, stateTable)

    if (tx.value && stateTable[tx.to].src && !tx.isContractCreation() && !tx.isContractCall()) {
      result = this.invokeUpdate(tx.to, '__on_received', tx.data.params, options)
    }

    if (tx.value > 0) {
      const emitTransferred = (tags) => {
        return utils.emitTransferred(null, tags, tx.from, tx.to, tx.value)
      }
      if (result) {
        result.then(r => {
          emitTransferred(r[1])
          return r
        })
      } else {
        result = [undefined, emitTransferred()]
      }
    }

    return result
  }

  checkTx (tx) {
    // Check TX should not modify state
    // This way, we could avoid make a copy of state

    // Check balance
    if (tx.value + tx.fee > utils.balanceOf(tx.from, this.stateTable)) {
      throw new Error('Not enough balance')
    }
  }

  async getMetadata (addr) {
    if (this.stateTable[addr] && this.stateTable[addr].src) {
      const { meta } = this.stateTable[addr]

      if (meta && meta.operations) {
        return utils.unifyMetadata(meta.operations)
      }

      const info = await this.queryMetadata(addr)
      if (!info) return utils.unifyMetadata()

      const props = info.meta ||
        (info.instance ? utils.getAllPropertyNames(info.instance) : info)

      return utils.unifyMetadata(props)
    }

    throw new Error('Address is not a valid contract.')
  }
}
