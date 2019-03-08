const _ = require('lodash')

exports.for = (invokeType, contractAddress, methodName, methodParams, options) => {
  const map = {
    transaction: exports.forTransaction,
    view: exports.forView,
    pure: exports.forPure
  }

  const fn = map[invokeType] ? map[invokeType] : exports.forMetadata
  return typeof fn === 'function' ? fn(contractAddress, methodName, methodParams, options) : fn
}

exports.forTransaction = (address, fname, fparams, { tx, block, stateAccess, tools }) => {
  const { balanceOf, getCode } = tools
  const {
    hasState,
    getState,
    setState,
    deleteState,
    transfer: doTransfer
  } = stateAccess.forUpdate(address)

  const importTableName = getCode(address).meta.importTableName
  const transfer = (to, value) => {
    doTransfer(to, value)
    ctx.balance -= parseFloat(value) || 0
  }

  const ctx = {
    address,
    balance: balanceOf(address),
    getEnv: () => ({ tags: [] }),
    importTableName,
    log: console.log,
    get_msg_name: () => fname,
    get_msg_param: () => (fparams && fparams.length) ? parseInt(fparams[0]) : 0,
    get_sender: () => tx.from,
    has_state: hasState,
    load_int: getState,
    save_int: setState,
    delete_state: deleteState,
    transfer
  }

  return ctx
}

exports.forView = (address, name, params, { from, block, stateAccess, tools }) => {
  const { balanceOf, getCode } = tools
  const {
    hasState,
    getState,
    setState,
    deleteState,
    transfer
  } = stateAccess.forView(address)

  const importTableName = getCode(address).meta.importTableName

  const ctx = {
    address,
    balance: balanceOf(address),
    log: console.log,
    importTableName,
    get_msg_name: () => name,
    get_msg_param: () => (params && params.length) ? parseInt(params[0]) : 0,
    get_sender: () => from,
    has_state: hasState,
    load_int: getState,
    save_int: setState,
    delete_state: deleteState,
    transfer
  }

  return ctx
}

exports.forPure = (address, name, params, { from }) => {
  const ctx = {
    address,
    log: console.log,
    get_msg_name: () => name,
    get_msg_param: () => (params && params.length) ? parseInt(params[0]) : 0,
    get_sender: () => from,
  }

  return ctx
}

exports.forMetadata = {
  address: '',
  balance: 0,
  log: console.log,
  get_msg_name: () => '__metadata',
  get_msg_param: () => 0,
  get_sender: () => '',
  load_int: () => 0,
  save_int: () => undefined
}
