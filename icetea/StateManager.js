const config = require('./config')
const utils = require('./helper/utils')
const merkle = require('./helper/merkle')

module.exports = class StateManager {
  constructor (stateTable) {
    this.stateTable = stateTable || {}
    this.init()
  }

  init () {
    config.initialBalances.forEach(item => {
      utils.prepareState(item.address, this.stateTable, {
        balance: item.balance
      })
    })
  }

  async loadState () {
    const storedData = await merkle.load()
    this.stateTable = storedData.state
    this.lastBlock = storedData.block

    // FIXME it is ok now as we don't allow delete state
    if (!Object.keys(this.stateTable).length) {
      console.log('Empty state after load => set init value')
      this.init()
    }
  }

  getLastState () {
    if (this.lastBlock && this.lastBlock > 1) {
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

  onNewBlock (block) {
    this.lastBlock = Object.freeze(block)
  }

  saveState () {
    if (!this.lastBlock || this.lastBlock.number === 1) {
      return Buffer.alloc(0)
    }
    return merkle.save({
      block: this.lastBlock,
      state: this.stateTable
    })
  }

  balanceOf (addr) {
    return utils.balanceOf(addr, this.stateTable)
  }

  getContractAddresses () {
    return Object.keys(this.stateTable).reduce((prev, addr) => {
      if (this.stateTable[addr].src) {
        prev.unshift(addr)
      }
      return prev
    }, [])
  }
}
