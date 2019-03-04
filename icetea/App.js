const ContractInvoker = require('./ContractInvoker')
const StateManager = require('./StateManager')
const ecc = require('./helper/ecc')
const utils = require('./helper/utils')
const config = require('./config')

module.exports = class {
  constructor () {
    this.invoker = new ContractInvoker()
    const t = this.stateManager = new StateManager()
    
    // Copy some methods
    Object.assign(this, {
      setBlock: t.setBlock.bind(t),
      persistState: t.persist.bind(t),
      balanceOf: t.balanceOf.bind(t),
      getContractAddresses: t.getContractAddresses.bind(t)
    })
  }

  async activate () {
    await this.stateManager.load()
    return this.stateManager.getLastState()
  }

  checkTx (tx) {
    // Check TX should not modify state
    // This way, we could avoid make a copy of state

    ecc.verifyTxSignature(tx)

    // Check balance
    if (tx.value + tx.fee > this.stateManager.balanceOf(tx.from)) {
      throw new Error('Not enough balance')
    }
  }

  invokeView (contractAddress, methodName, methodParams, options = {}) {
    options.stateTable = options.stateTable || this.stateManager.getStateView()
    options.block = this.stateManager.getBlock()
    return this.invoker.invokeView(contractAddress, methodName, methodParams, options)
  }

  queryMetadata (contractAddress, options = {}) {
    options.stateTable = options.stateTable || this.stateManager.getStateView()
    return this.invoker.queryMetadata(contractAddress, options)
  }

  async getMetadata (addr) {
    const { src, meta } = this.stateManager.getAccountState(addr)
    if (!src) {
      throw new Error('Address is not a valid contract.')
    }

    if (meta && meta.operations) {
      return utils.unifyMetadata(meta.operations)
    }

    const info = await this.queryMetadata(addr)
    if (!info) return utils.unifyMetadata()

    const props = info.meta ||
            (info.instance ? utils.getAllPropertyNames(info.instance) : info)

    return utils.unifyMetadata(props)
  }

  async execTx (tx) {
    const draft = this.stateManager.produceDraft()

    const result = await this._doExecTx({
      tx,
      block: this.stateManager.getBlock(),
      stateTable: draft
    })

    // commit change made to state
    // if _doExecTx throws, this won't be called
    this.stateManager.applyDraft(draft)

    return result || []
  }

  /**
   * @private
   */
  async _doExecTx (options) {
    const { tx, stateTable } = options
    let result

    if (tx.isContractCreation()) {
      // analyze & save contract state
      const contractAddress = this.invoker.deployContract(tx, stateTable)

      // call constructor
      result = this.invoker.invokeUpdate(
        contractAddress,
        '__on_deployed',
        tx.data.params,
        options
      ).then(r => {
        // when deploy contract, always return the contract address
        r[0] = contractAddress
        return r
      })
    } else if (tx.isContractCall()) {
      if (['constructor', '__on_received', '__on_deployed', 'getState', 'setState', 'getEnv'].includes(tx.data.name)) {
        throw new Error('Calling this method directly is not allowed')
      }
      result = this.invoker.invokeTx(options)
    }

    // process value transfer
    utils.decBalance(tx.from, tx.value + tx.fee, stateTable)
    utils.incBalance(tx.to, tx.value, stateTable)
    utils.incBalance(config.feeCollector, tx.fee, stateTable)

    // call __on_received
    if (tx.value && stateTable[tx.to].src && !tx.isContractCreation() && !tx.isContractCall()) {
      result = this.invoker.invokeUpdate(tx.to, '__on_received', tx.data.params, options)
    }

    // emit Transferred event
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
}
