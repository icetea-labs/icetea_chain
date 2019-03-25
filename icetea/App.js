const { verifyTxSignature } = require('icetea-common/src/utils')
const utils = require('./helper/utils')
const sysContracts = require('./system')
const BotNames = require('./system/BotNames')
const alias = sysContracts.get(BotNames.Alias)
const invoker = require('./ContractInvoker')

const stateManager = require('./StateManager')

function _ensureAddress (addr) {
  // resolve alias
  if (addr && addr.includes('.')) {
    return alias.ensureAddress(addr)
  }

  return addr
}

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
    const lastState = stateManager.getLastState()
    console.log('Last state loaded', { height: lastState.lastBlockHeight, appHash: lastState.lastBlockAppHash.toString('hex').toUpperCase() })
    return lastState
  }

  installSystemContracts () {
    sysContracts.all().forEach(key => {
      const state = stateManager.installSystemContract(key)
      const contract = sysContracts.get(key)
      contract.unsafeStateManager = () => stateManager
      if (typeof contract.ondeploy === 'function') {
        contract.ondeploy(state)
      }
    })
  }

  addStateObserver ({ beforeTx, afterTx }) {
    stateManager.on('beginCheckpoint', beforeTx)
    stateManager.on('endCheckpoint', afterTx)
  }

  checkTx (tx) {
    // Check TX should not modify state
    // This way, we could avoid make a copy of state

    verifyTxSignature(tx)

    // Check balance
    if (tx.value + tx.fee > stateManager.balanceOf(tx.from)) {
      throw new Error('Not enough balance')
    }
  }

  invokeView (contractAddress, methodName, methodParams, options = {}) {
    // resolve alias
    contractAddress = _ensureAddress(contractAddress)

    const { stateAccess, tools } = stateManager.produceDraft()
    options.stateAccess = stateAccess
    options.tools = tools
    options.block = stateManager.getBlock()
    return invoker.invokeView(contractAddress, methodName, methodParams, options)
  }

  invokePure (contractAddress, methodName, methodParams, options = {}) {
    // resolve alias
    contractAddress = _ensureAddress(contractAddress)

    const { tools } = stateManager.produceDraft()
    options.tools = tools
    return invoker.invokePure(contractAddress, methodName, methodParams, options)
  }

  getMetadata (addr) {
    // resolve alias
    addr = _ensureAddress(addr)

    const { system, src, meta } = stateManager.getAccountState(addr)
    if (!src && !system) {
      throw new Error('Address is not a valid contract.')
    }

    if (meta && meta.operations) {
      return utils.unifyMetadata(meta.operations)
    }

    const info = invoker.queryMetadata(addr, stateManager.getMetaProxy(addr))

    if (!info) return utils.unifyMetadata()

    const props = info.meta ||
      (info.instance ? utils.getAllPropertyNames(info.instance) : info)

    return utils.unifyMetadata(props)
  }

  getAccountInfo (addr) {
    const { balance = 0, system, mode, src, deployedBy } = stateManager.getAccountState(addr)
    return { balance, system, mode, hasSrc: !!src, deployedBy }
  }

  execTx (tx) {
    // resolve alias
    tx.to = _ensureAddress(tx.to)

    stateManager.beginCheckpoint()

    const needState = willCallContract(tx)
    const { stateAccess, patch, tools } = needState ? stateManager.produceDraft() : {}

    const result = doExecTx({
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
 * validate tx op and tx.to source
 * @private
 * @function
 * @param {object} tx - transation
 * @return {boolean} is right to execute
 */
function willCallContract (tx) {
  return tx.isContractCreation() || tx.isContractCall() || (tx.value > 0 && stateManager.isContract(tx.to))
}

/**
 * execute tx logic
 * @private
 * @function
 * @param {object} options - options
 * @return {object} result
 */
function doExecTx (options) {
  const { tx, tools = {} } = options
  let result

  if (tx.isContractCreation()) {
    // analyze & save contract state
    const contractState = invoker.prepareContract(tx)
    tx.to = tools.deployContract(tx.from, contractState)
  }

  // process value transfer
  (tools.refectTxValueAndFee || stateManager.handleTransfer)(tx)

  if (tx.isContractCreation()) {
    // call constructor
    result = invoker.invokeUpdate(
      tx.to,
      '__on_deployed',
      tx.data.params,
      options
    )
    // Result of ondeploy should be address
    result[0] = tx.to
  } else if (tx.isContractCall()) {
    if (['constructor', '__on_received', '__on_deployed', 'getState', 'setState', 'getEnv'].includes(tx.data.name)) {
      throw new Error('Calling this method directly is not allowed')
    }
    result = invoker.invokeTx(options)
  }

  // call __on_received
  if (tx.value && stateManager.isRegularContract(tx.to) && !tx.isContractCreation() && !tx.isContractCall()) {
    result = invoker.invokeUpdate(tx.to, '__on_received', tx.data.params, options)
  }

  if (result && result.__gas_used && tools.refectTxValueAndFee) {
    tools.refectTxValueAndFee({ from: tx.from, value: 0, fee: -(tx.fee - result.__gas_used) })
    delete result.__gas_used
  }

  // emit Transferred event
  if (tx.value > 0) {
    const emitTransferred = (tags) => {
      return utils.emitTransferred(null, tags, tx.from, tx.to, tx.value)
    }
    if (result) {
      emitTransferred(result[1])
    } else {
      result = [undefined, emitTransferred()]
    }
  }

  return result
}

module.exports = utils.newAndBind(App)
