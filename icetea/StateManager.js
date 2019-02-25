const _ = require('lodash')
const config = require('./config')
const utils = require('./helper/utils')
const ecc = require('./helper/ecc')
const merkle = require('./helper/merkle')
const { getRunner, getContext, getGuard } = require('./vm')

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
    this.lastBlockHeight = storedData.height

    if (!Object.keys(this.stateTable).length) {
      console.log('Empty state after load => set init value')
      this.init()
    }
  }

  getLastState () {
    if (this.lastBlockHeight) {
      return {
        lastBlockHeight: this.lastBlockHeight,
        lastBlockAppHash: merkle.getHash(this.stateTable)
      }
    } else {
      return {
        lastBlockHeight: 0,
        lastBlockAppHash: Buffer.alloc(0)
      }
    }
  }

  beginBlock (block) {
    this.lastBlock = block
  }

  endBlock () {
  }

  commit () {
    this.lastBlockHeight = (this.lastBlockHeight || 0) + 1
    if (this.lastBlockHeight === 1) return Buffer.alloc(0)
    return merkle.save({
      height: this.lastBlockHeight,
      state: this.stateTable
    })
  }

  checkTx (tx) {
    // Check TX should not modify state
    // This way, we could avoid make a copy of state

    // Verify signature
    ecc.verifyTxSignature(tx)

    // Check balance
    if (tx.value + tx.fee > utils.balanceOf(tx.from, this.stateTable)) {
      throw new Error('Not enough balance')
    }
  }

  getContractAddresses () {
    const arr = []
    _.each(this.stateTable, (value, key) => {
      if (value.src) {
        arr.push(key)
      }
    })

    return arr
  }

  getMetadata (addr) {
    if (this.stateTable[addr] && this.stateTable[addr].src) {
      const { mode, src, meta } = this.stateTable[addr]

      if (meta && meta.operations) {
        return utils.unifyMetadata(meta.operations)
      }

      const vm = getRunner(mode)
      const context = getContext(mode).dummyContext
      const info = vm.run(src, { context })
      if (!info) return utils.unifyMetadata()

      const props = info.meta ||
        (info.instance ? utils.getAllPropertyNames(info.instance) : info)

      return utils.unifyMetadata(props)
    }

    throw new Error('Address is not a valid contract.')
  }
}
