const config = require('./config')
const merkle = require('./helper/merkle')
const EventEmitter = require('events')
const stateProxy = require('./StateProxy')

// Declare outside class to ensure private
let stateTable, lastBlock

class StateManager extends EventEmitter {
  async load () {
    const storedData = (await merkle.load()) || {
      state: initStateTable()
    }

    stateTable = storedData.state
    lastBlock = storedData.block
  }

  getLastState () {
    if (lastBlock && lastBlock.number > 1) {
      return {
        lastBlockHeight: lastBlock.number,
        lastBlockAppHash: merkle.getHash(stateTable)
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

  persist () {
    if (!lastBlock || lastBlock.number <= 1) {
      return Buffer.alloc(0)
    }
    const appHash = merkle.getHash(stateTable)
    merkle.save({
      block: lastBlock,
      state: stateTable
    })

    // return, no need to wait for save to finish
    return appHash
  }

  handleTransfer (tx) {
    (tx.value + tx.fee) && decBalance(tx.from, tx.value + tx.fee)
    tx.value && incBalance(tx.to, tx.value)
    tx.fee && incBalance(config.feeCollector, tx.fee)
  }

  produceDraft () {
    // return _.cloneDeep(stateTable)
    return stateProxy.getStateProxy(stateTable)
  }

  applyDraft (patch) {
    // utils.mergeStateTables(stateTable, draft)
    stateProxy.applyChanges(stateTable, patch)
    return this
  }

  beginCheckpoint () {
    this.emit('beginCheckpoint', stateTable)
  }

  endCheckpoint () {
    this.emit('endCheckpoint', stateTable)
  }

  // Utility function to get state

  getMetaProxy () {
    return stateProxy.getMetaProxy(stateTable)
  }

  isContract (address) {
    return !!(stateTable[address] || {}).src
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
      if (stateTable[addr].src) {
        prev.unshift(addr)
      }
      return prev
    }, [])
  }

  debugState () {
    if (process.env.NODE_ENV === 'development') {
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
      balance: item.balance
    }

    return stateTable
  }, {})
}

function incBalance (addr, delta) {
  delta = parseFloat(delta) || 0
  const state = stateTable[addr] || (stateTable[addr] = {})
  const balance = state.balance || 0
  if (balance + delta < 0) {
    throw new Error('Not enough balance')
  }
  state.balance = balance + delta
}

function decBalance (addr, delta) {
  incBalance(addr, -delta)
}

module.exports = new StateManager()
