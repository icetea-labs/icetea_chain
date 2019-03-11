const ecc = require('./helper/ecc')
const utils = require('./helper/utils')
const {
  queryMetadata,
  prepareContract,
  invokeView,
  invokePure,
  invokeUpdate,
  invokeTx
} = require('./ContractInvoker')

const stateManager = require('./StateManager')

class App {
  constructor () {
    // Copy some methods
    Object.assign(this, {
      setBlock: stateManager.setBlock.bind(stateManager),
      loadState: stateManager.load.bind(stateManager),
      persistState: stateManager.persist.bind(stateManager),
      balanceOf: stateManager.balanceOf.bind(stateManager),
      getContractAddresses: stateManager.getContractAddresses.bind(stateManager),
      debugState: stateManager.debugState.bind(stateManager)
    })
  }

  async activate () {
    await stateManager.load()
    return stateManager.getLastState()
  }

  addStateObserver ({ beforeTx, afterTx }) {
    stateManager.on('beginCheckpoint', beforeTx)
    stateManager.on('endCheckpoint', afterTx)
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
    const { stateAccess, tools } = stateManager.produceDraft()
    options.stateAccess = stateAccess
    options.tools = tools
    options.block = stateManager.getBlock()
    return invokeView(contractAddress, methodName, methodParams, options)
  }

  invokePure (contractAddress, methodName, methodParams, options = {}) {
    const { tools } = stateManager.produceDraft()
    options.tools = tools
    return invokePure(contractAddress, methodName, methodParams, options)
  }

  async getMetadata (addr) {
    const { src, meta } = stateManager.getAccountState(addr)
    if (!src) {
      throw new Error('Address is not a valid contract.')
    }

    if (meta && meta.operations) {
      return utils.unifyMetadata(meta.operations)
    }

    const info = await queryMetadata(addr, stateManager.getMetaProxy(addr))
    if (!info) return utils.unifyMetadata()

    const props = info.meta ||
      (info.instance ? utils.getAllPropertyNames(info.instance) : info)

    return utils.unifyMetadata(props)
  }

  async execTx (tx) {
    stateManager.beginCheckpoint()

    const needState = willCallContract(tx)
    const { stateAccess, patch, tools } = needState ? stateManager.produceDraft(tx) : {}

    const result = await doExecTx({
      tx,
      block: stateManager.getBlock(),
      stateAccess,
      tools
    })

    // commit change made to state
    // if _doExecTx throws, this won't be called
    if (needState) {
      stateManager.applyDraft(patch)
    }

    stateManager.endCheckpoint()

    return result || []
  }
}

/**
 * @private
 */
function willCallContract (tx) {
  return tx.isContractCreation() || tx.isContractCall() || (tx.value > 0 && stateManager.isContract(tx.to))
}

/**
   * @private
   */
async function doExecTx (options) {
  const { tx, tools = {} } = options
  let result

  if (tx.isContractCreation()) {
    // analyze & save contract state
    const contractState = prepareContract(tx)
    tx.to = tools.deployContract(tx.from, contractState)
  }

  // process value transfer
  (tools.refectTxValueAndFee || stateManager.handleTransfer)(tx)

  if (tx.isContractCreation()) {
    // call constructor
    result = invokeUpdate(
      tx.to,
      '__on_deployed',
      tx.data.params,
      options
    ).then(r => {
      // when deploy contract, always return the contract address
      r[0] = tx.to
      return r
    })
  } else if (tx.isContractCall()) {
    if (['constructor', '__on_received', '__on_deployed', 'getState', 'setState', 'getEnv'].includes(tx.data.name)) {
      throw new Error('Calling this method directly is not allowed')
    }
    result = invokeTx(options)
  }

  // call __on_received
  if (tx.value && stateManager.isContract(tx.to) && !tx.isContractCreation() && !tx.isContractCall()) {
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
