const _ = require('lodash')
const config = require('./config')
const utils = require('./helper/utils')
const ecc = require('./helper/ecc')
const merkle = require('./helper/merkle')
const { getRunner, getContext, getGuard } = require('./vm')

module.exports = class Worker {
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
    const { height, hash, timestamp, state } = storedData
    this.stateTable = state
    this.beginBlock({ number: height, hash, timestamp })

    if (!Object.keys(this.stateTable).length) {
      console.log('Empty state after load => set init value')
      this.init()
    }
  }

  info () {
    if (this.lastBlock && this.lastBlock.number) {
      return {
        lastBlockHeight: this.lastBlock.number,
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
    // utils.incBalance("miner", 5, this.stateTable);
  }

  commit () {
    if (this.lastBlock.number === 1) return Buffer.alloc(0)
    return merkle.save({
      height: this.lastBlock.number,
      state: this.stateTable,
      timestamp: this.lastBlock.timestamp,
      hash: this.lastBlock.hash
    })
  }

  verifyTx (tx) {
    // To verify signature, we need the hash (or some representation of content)
    // But at the time client broad_tx, she does not know the tendermint's hash
    // which is not available until check_tx
    // Because it is unreliable to reproduce the way tendermint calculates hash
    // we use a separate content hash for signature checking

    // It is important that we wrap the way this content hash is generated
    // inside a web3-like lib's "sign" function

    if (!ecc.verifyTx(tx)) {
      throw new Error('Invalid signature')
    }
  }

  checkTx (tx) {
    // Check TX should not modify state
    // This way, we could avoid make a copy of state

    // Verify signature
    this.verifyTx(tx)

    // Check balance
    if (tx.value + tx.fee > this.balanceOf(tx.from)) {
      throw new Error('Not enough balance')
    }
  }

  async callContract (tx, block, stateTable, overrides) {
    const options = Object.assign({
      address: tx.to,
      fname: tx.data.name,
      fparams: tx.data.params
    }, overrides || {})

    let scAddr = options.address
    const t = stateTable
    if (!t[scAddr] || !t[scAddr].src) {
      throw new Error(`Address ${scAddr} is not a valid contract`)
    } else {
      const { mode, src } = t[scAddr]
      const context = getContext(mode).contextForWrite(tx, block, t, options)
      const guard = getGuard(mode)(src)
      const vm = getRunner(mode)
      const result = await vm.run(src, { context, guard })

      // save back the state
      t[scAddr].state = Object.assign(t[scAddr].state || {}, context._state)

      return [result, context.getEnv().tags]
    }
  }

  async doExecTx (tx, block, stateTable) {
    let result

    // deploy contract
    if (tx.isContractCreation()) {
      // make new address for smart contract
      // should be deterministic
      const count = Object.keys(stateTable).reduce((t, k) => (
        (k.startsWith('contract_') && k.endsWith(tx.from)) ? (t + 1) : t), 0)
      let scAddr = 'contract_' + count + '_' + tx.from
      tx.to = scAddr

      const mode = tx.data.mode
      const src = Buffer.from(tx.data.src, 'base64')
      const deployedBy = tx.from
      const vm = getRunner(mode)
      const compiledSrc = vm.compile(src)
      const meta = vm.verify(compiledSrc) // linter & halt-problem checking

      const state = {
        balance: 0,
        mode,
        deployedBy,
        src: compiledSrc
      }
      if (meta) {
        state.meta = meta
      }
      utils.prepareState(scAddr, stateTable, state)

      // call constructor
      result = this.callContract(tx, block, stateTable, {
        fname: '__on_deployed'
      }).then(r => {
        r[0] = scAddr
        return r
      })
    }

    // call contract
    if (tx.isContractCall()) {
      if (['constructor', '__on_received', '__on_deployed', 'getState', 'setState', 'getEnv'].includes(tx.data.name)) {
        throw new Error('Calling this method directly is not allowed')
      }
      result = this.callContract(tx, block, stateTable)
    }

    // process value transfer
    utils.decBalance(tx.from, tx.value + tx.fee, stateTable)
    utils.incBalance(tx.to, tx.value, stateTable)
    // utils.incBalance("miner", tx.fee, stateTable);

    if (tx.value && stateTable[tx.to].src && !tx.isContractCreation() && !tx.isContractCall()) {
      result = this.callContract(tx, block, stateTable, {
        address: tx.to,
        fname: '__on_received'
      })
    }

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

  async execTx (tx) {
    const block = this.lastBlock

    // clone the state so that we could revert on exception
    var tmpStateTable = _.cloneDeep(this.stateTable)
    try {
      const result = await this.doExecTx(tx, block, tmpStateTable)
      // This should make sure 'balance' setter is maintained
      utils.mergeStateTables(this.stateTable, tmpStateTable)
      // console.log(result)
      return result || []
    } catch (error) {
      console.log(error)
      throw error
    }
  }

  balanceOf (who, t) {
    const state = (t || this.stateTable)[who]
    if (!state) return 0

    return state.balance || 0
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

  callViewFunc (addr, name, params, options) {
    if (name === 'address') {
      return addr
    } else if (name === 'balance') {
      return this.balanceOf(addr)
    }

    const block = this.lastBlock
    options = Object.assign(options || {}, { block })

    if (this.stateTable[addr] && this.stateTable[addr].src) {
      const { mode, src } = this.stateTable[addr]
      const vm = getRunner(mode)
      const context = getContext(mode).contextForView(this.stateTable, addr, name, params, options)
      const guard = getGuard(mode)(src)
      return vm.run(src, { context, guard })
    }

    throw new Error('The address supplied is not a deployed contract')
  }

  callPureFunc (addr, name, params) {
    if (this.stateTable[addr] && this.stateTable[addr].src) {
      const { mode, src } = this.stateTable[addr]
      const vm = getRunner(mode)
      const context = getContext(mode).contextForPure(addr, name, params)
      const guard = getGuard(mode)(src)
      return vm.run(src, { context, guard })
    }

    throw new Error('The address supplied is not a deployed contract')
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
