const config = require('./config')
const utils = require('./helper/utils')
const merkle = require('./helper/merkle')
const _ = require('lodash')

module.exports = class StateManager {
  async load () {
    const storedData = (await merkle.load()) || {
      state: this._initStateTable()
    }

    this.stateTable = storedData.state
    this.lastBlock = storedData.block
  }

  getLastState () {
    if (this.lastBlock && this.lastBlock.number > 1) {
      return {
        lastBlockHeight: this.lastBlock.number,
        lastBlockAppHash: merkle.getHash(this.stateTable)
      }
    } else {
      return {
        lastBlockHeight: this.lastBlock ? 1 : 0,
        lastBlockAppHash: Buffer.alloc(0)
      }
    }
  }

  setBlock (block) {
    this.lastBlock = Object.freeze(block)
  }

  persist () {
    if (!this.lastBlock || this.lastBlock.number <= 1) {
      return Buffer.alloc(0)
    }
    const appHash = merkle.getHash(this.stateTable)
    merkle.save({
      block: this.lastBlock,
      state: this.stateTable
    })

    // return, no need to wait for save to finish
    return appHash
  }

  produceDraft () {
    return _.cloneDeep(this.stateTable)
  }

  applyDraft (draft) {
    utils.mergeStateTables(this.stateTable, draft)
    return this
  }

  // Utility function to get state

  getStateView () {
    return this.stateTable
  }

  getAccountState (addr) {
    return this.stateTable[addr] || {}
  }

  getBlock () {
    return this.lastBlock
  }

  balanceOf (addr) {
    return this.getAccountState(addr).balance || 0
  }

  getContractAddresses () {
    return Object.keys(this.stateTable).reduce((prev, addr) => {
      if (this.stateTable[addr].src) {
        prev.unshift(addr)
      }
      return prev
    }, [])
  }

  // Private stuff

  _initStateTable () {
    return config.initialBalances.reduce((stateTable, item) => {
      utils.prepareState(item.address, stateTable, {
        balance: item.balance
      })
      return stateTable
    }, {})
  }
}
