const _ = require('lodash')
const Worker = require('../../Worker')
const Tx = require('../../Tx')

const emptyBlock = {
  timestamp: 0,
  number: 0,
  hash: ''
}

exports.contextForWrite = (tx, block, stateTable, { address, fname, fparams }) => {
  const state = stateTable[address].state || {}
  const balance = stateTable[address].balance || 0
  const importTableName = stateTable[address].meta.importTableName

  const ctx = {
    address,
    balance,
    getEnv: () => ({ tags: [] }),
    importTableName,
    log: console.log,
    get_msg_name: () => fname,
    get_msg_param: () => fparams,
    get_msg_value: () => tx.value,
    get_sender: () => tx.from,
    get_address: () => address,
    now: () => block.timestamp,
    get_block_hash: () => block.hash,
    get_block_number: () => block.number,
    _state: {},
    load: (key) => {
      return ctx._state.hasOwnProperty(key) ? ctx._state[key] : (state.hasOwnProperty(key) ? state[key] : 0)
    },
    save: (key, value) => {
      ctx._state[key] = value
    }
  }

  return ctx
}

exports.contextForView = exports.contextForView = (stateTable, address, name, params, options) => {
  const block = options.block || emptyBlock
  const state = _.cloneDeep(stateTable[address].state || {})
  const balance = state.balance || 0
  const importTableName = stateTable[address].meta.importTableName

  const ctx = {
    address,
    balance,
    log: console.log,
    importTableName,
    get_msg_name: () => name,
    get_msg_param: () => params,
    get_msg_value: () => { throw new Error('Cannot get message value inside a view function') },
    get_sender: () => options.from,
    get_address: () => address,
    now: () => block.timestamp,
    get_block_hash: () => block.hash,
    get_block_number: () => block.number,
    load_contract: (addr) => {
      const worker = new Worker(stateTable)
      return new Proxy({}, {
        get (obj, method) {
          const real = obj[method]
          if (!real) {
            return (...params) => worker.callViewFunc(addr, method, params, { from: address })
          }
          return real
        }
      })
    },
    load: (key) => {
      return state[key] || 0
    },
    save: () => {
      throw new Error('Cannot change state inside a view function')
    }
  }

  return ctx
}

exports.contextForPure = (address, name, params, options) => {
  const ctx = {
    address,
    log: console.log,
    get balance () {
      throw new Error('Cannot view balance a pure function')
    },
    get_msg_name: () => name,
    get_msg_param: () => (params && params.length) ? params[0] : '',
    get_sender: () => options.from,
    load_int: () => {
      throw new Error('Cannot read state inside a pure function')
    },
    save_int: () => {
      throw new Error('Cannot change state inside a pure function')
    }
  }

  return ctx
}

exports.dummyContext = {
  address: '',
  balance: 0,
  log: console.log,
  get_msg_name: () => '__metadata',
  get_msg_param: () => 0,
  get_sender: () => '',
  load_int: () => 0,
  save_int: () => undefined
}
