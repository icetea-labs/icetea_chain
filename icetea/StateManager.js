const config = require('./config')
const utils = require('./helper/utils')
const merkle = require('./helper/merkle')
const _ = require('lodash')
const stateProxy = require('./helper/StateProxy')

// Declare outside class to ensure private
let stateTable, lastBlock

class StateManager {
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

  produceDraft () {
    return _.cloneDeep(stateTable)
  }

  applyDraft (draft) {
    utils.mergeStateTables(stateTable, draft)
    return this
  }

  // Utility function to get state

  getStateForView (contractAddress) {
    return stateProxy.getStateForView(stateTable, contractAddress)
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
    return utils.balanceOf(addr, stateTable)
  }

  getContractAddresses () {
    return Object.keys(stateTable).reduce((prev, addr) => {
      if (stateTable[addr].src) {
        prev.unshift(addr)
      }
      return prev
    }, [])
  }
}

// Private stuff

function initStateTable () {
  return config.initialBalances.reduce((stateTable, item) => {
    utils.prepareState(item.address, stateTable, {
      balance: item.balance
    })
    return stateTable
  }, {})
}

module.exports = utils.newAndBind(StateManager)
