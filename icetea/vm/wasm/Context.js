const _ = require('lodash')

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
    get_msg_param: () => (fparams && fparams.length) ? parseInt(fparams[0]) : 0,
    get_sender: () => tx.from,
    _state: {},
    load_int: (key) => {
      return ctx._state.hasOwnProperty(key) ? ctx._state[key] : (state.hasOwnProperty(key) ? state[key] : 0)
    },
    save_int: (key, value) => {
      ctx._state[key] = value
    }
  }

  return ctx
}

exports.contextForView = exports.contextForView = (stateTable, address, name, params, options) => {
  const state = _.cloneDeep(stateTable[address].state || {})
  const balance = state.balance || 0
  const importTableName = stateTable[address].meta.importTableName

  const ctx = {
    address,
    balance,
    log: console.log,
    importTableName,
    get_msg_name: () => name,
    get_msg_param: () => (params && params.length) ? parseInt(params[0]) : 0,
    get_sender: () => options.from,
    load_int: (key) => {
      return state[key] || 0
    },
    save_int: () => {
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
    get_msg_param: () => (params && params.length) ? parseInt(params[0]) : 0,
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
