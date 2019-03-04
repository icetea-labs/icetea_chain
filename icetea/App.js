const ecc = require('./helper/ecc')
const utils = require('./helper/utils')
const config = require('./config')
const {
  queryMetadata,
  deployContract,
  invokeView,
  invokeUpdate,
  invokeTx
} = require('./ContractInvoker')

const stateManager = require('./StateManager')

class App {
  constructor () {
    // Copy some methods
    Object.assign(this, {
      setBlock: stateManager.setBlock,
      loadState: stateManager.load,
      persistState: stateManager.persist,
      balanceOf: stateManager.balanceOf,
      getContractAddresses: stateManager.getContractAddresses
    })
  }

  async activate () {
    await stateManager.load()
    return stateManager.getLastState()
  }

  checkTx (tx) {
    // Check TX should not modify state
    // This way, we could avoid make a copy of state

    ecc.verifyTxSignature(tx)

    // Check balance
    if (tx.value + tx.fee > stateManager.balanceOf(tx.from)) {
      throw new Error('Not enough balance')
    }
  }

  invokeView (contractAddress, methodName, methodParams, options = {}) {
    options.stateTable = options.stateTable || stateManager.getStateView()
    options.block = stateManager.getBlock()
    return invokeView(contractAddress, methodName, methodParams, options)
  }

  async getMetadata (addr) {
    const { src, meta } = stateManager.getAccountState(addr)
    if (!src) {
      throw new Error('Address is not a valid contract.')
    }

    if (meta && meta.operations) {
      return utils.unifyMetadata(meta.operations)
    }

    const info = await queryMetadata(addr, { stateTable: stateManager.getStateView() })
    if (!info) return utils.unifyMetadata()

    const props = info.meta ||
            (info.instance ? utils.getAllPropertyNames(info.instance) : info)

    return utils.unifyMetadata(props)
  }

  async execTx (tx) {
    const draft = stateManager.produceDraft()

    const result = await doExecTx({
      tx,
      block: stateManager.getBlock(),
      stateTable: draft
    })

    // commit change made to state
    // if _doExecTx throws, this won't be called
    stateManager.applyDraft(draft)

    return result || []
  }
}

/**
   * @private
   */
async function doExecTx (options) {
  const { tx, stateTable } = options
  let result

  if (tx.isContractCreation()) {
    // analyze & save contract state
    const contractAddress = deployContract(tx, stateTable)

    // call constructor
    result = invokeUpdate(
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
    result = invokeTx(options)
  }

  // process value transfer
  utils.decBalance(tx.from, tx.value + tx.fee, stateTable)
  utils.incBalance(tx.to, tx.value, stateTable)
  utils.incBalance(config.feeCollector, tx.fee, stateTable)

  // call __on_received
  if (tx.value && stateTable[tx.to].src && !tx.isContractCreation() && !tx.isContractCall()) {
    result = invokeUpdate(tx.to, '__on_received', tx.data.params, options)
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

module.exports = utils.newAndBind(App)
