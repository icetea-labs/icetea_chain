const config = require('./config')
// const merkle = require('./helper/merkle')
const patricia = require('./helper/patricia')
const EventEmitter = require('events')
const stateProxy = require('./stateproxy')
const utils = require('./helper/utils')

// Declare outside class to ensure private
let stateTable, lastBlock

// address key need to commit on write opts
const needCommitKeys = new Set()

class StateManager extends EventEmitter {
  async load (path) {
    const storedData = (await patricia.load(path)) || {
      state: initStateTable()
    }

    stateTable = storedData.state
    lastBlock = storedData.block
  }

  async getLastState () {
    if (lastBlock && lastBlock.number > 1) {
      return {
        lastBlockHeight: lastBlock.number,
        lastBlockAppHash: await patricia.root()
      }
    } else {
      return {
        lastBlockHeight: lastBlock ? 1 : 0,
        lastBlockAppHash: Buffer.alloc(0)
      }
    }
  }

  setBlock (block) {
    lastBlock = Object.freeze(block)
  }

  async persist () {
    if (!lastBlock || lastBlock.number <= 1) {
      return Buffer.alloc(0)
    }
    // const appHash = await patricia.getHash(stateTable)

    const appHash = await patricia.save({
      block: lastBlock,
      state: stateTable,
      commitKeys: needCommitKeys
    })
    needCommitKeys.clear()

    // return, no need to wait for save to finish
    return appHash
  }

  handleTransfer (tx) {
    (tx.value + tx.fee) && decBalance(tx.payer, tx.value + tx.fee)
    tx.value && incBalance(tx.to, tx.value)
    tx.fee && incBalance(config.feeCollector, tx.fee)
  }

  produceDraft () {
    // return _.cloneDeep(stateTable)
    return stateProxy.getStateProxy(stateTable)
  }

  applyDraft (patch) {
    // utils.mergeStateTables(stateTable, draft)
    Object.keys(patch.storages).map(key => needCommitKeys.add(key))
    Object.keys(patch.balances).map(key => needCommitKeys.add(key))
    Object.keys(patch.deployedContracts).map(key => needCommitKeys.add(key))
    stateProxy.applyChanges(stateTable, patch)
    return this
  }

  beginCheckpoint () {
    this.emit('beginCheckpoint', stateTable)
  }

  endCheckpoint () {
    this.emit('endCheckpoint', stateTable)
  }

  installSystemContract (address) {
    if (stateTable[address] && stateTable[address].deployedBy) {
      throw new Error(`Contract ${address} already installed.`)
    }

    stateTable[address] = Object.assign(stateTable[address] || {}, {
      system: true,
      deployedBy: 'system'
    })
    needCommitKeys.add(address)

    return stateTable[address]
  }

  // Utility function to get state

  getMetaProxy () {
    return stateProxy.getMetaProxy(stateTable)
  }

  isContract (address) {
    const state = stateTable[address]
    if (!state) return false

    return state.src || state.system
  }

  isRegularContract (address) {
    return !!(stateTable[address] || {}).src
  }

  isSystemContract (address) {
    return !!(stateTable[address] || {}).system
  }

  // FIXME This is not safe, should refactor
  getAccountState (addr) {
    return stateTable[addr] || {}
  }

  // block is immutable (Object.freeze), so it is safe to pass around
  getBlock () {
    return lastBlock
  }

  balanceOf (addr) {
    return (stateTable[addr] || {}).balance || 0
  }

  getContractAddresses () {
    return Object.keys(stateTable).reduce((prev, addr) => {
      if (this.isContract(addr)) {
        prev.unshift(addr)
      }
      return prev
    }, [])
  }

  debugState () {
    if (utils.isDevMode()) {
      return stateTable
    }

    return {
      info: 'Enable debug by setting NODE_ENV=development'
    }
  }
}

// Private stuff

function initStateTable () {
  return config.initialBalances.reduce((stateTable, item) => {
    stateTable[item.address] = {
      balance: BigInt(item.balance)
    }
    needCommitKeys.add(item.address)

    return stateTable
  }, {})
}

function incBalance (addr, delta) {
  // Note: there's no need to check for regular account here
  // because this is NOT called by contract
  // It is only called by app.js to handle 'transfer-only' tx

  delta = BigInt(delta || BigInt(0))
  const state = stateTable[addr] || (stateTable[addr] = {})
  const balance = state.balance || BigInt(0)
  if (balance + delta < BigInt(0)) {
    throw new Error('Not enough balance')
  }
  state.balance = balance + delta

  // TODO: review it, maybe it called from state proxy
  needCommitKeys.add(addr)
}

function decBalance (addr, delta) {
  incBalance(addr, -delta)
}

module.exports = new StateManager()
