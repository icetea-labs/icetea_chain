const { emitEvent } = require('../../helper/utils')
const invoker = require('../../ContractInvoker')

exports.for = (invokeType, contractAddress, methodName, methodParams, options) => {
  const map = {
    transaction: exports.forTransaction,
    view: exports.forView,
    pure: exports.forPure
  }

  const fn = map[invokeType] ? map[invokeType] : exports.forMetadata
  return typeof fn === 'function' ? fn(contractAddress, methodName, methodParams, options) : fn
}

exports.forTransaction = (address, fname, fparams=[], options) => {
  const { tx, block, stateAccess, tools } = options
  const { balanceOf, getCode } = tools
  const {
    hasState,
    getState,
    setState,
    deleteState,
    transfer
  } = stateAccess.forUpdate(address)

  const importTableName = getCode(address).meta.importTableName

  const tags = {}

  const ctx = {
    get_address: () => address,
    get_balance: () => balanceOf(address),
    getEnv: () => ({ tags }),
    importTableName,
    log: console.log,
    get_msg_name: () => fname,
    get_msg_param: () => fparams.map(x => typeof x === 'number' ? x.toString() : x),
    get_msg_value: () => tx.value,
    get_sender: () => tx.from || '',
    now: () => block.timestamp,
    get_block_hash: () => block.hash,
    get_block_number: () => block.number,
    call_contract: (to, method, params) => {
      return invoker.invokeUpdate(to, method, params, options)
    },
    has_state: hasState,
    load: key => getState(key, ''),
    save: setState,
    delete_state: deleteState,
    transfer,
    emit_event: (eventName, eventData, indexes = []) => {
      emitEvent(address, tags, eventName, eventData, indexes)
    }
  }

  return ctx
}

exports.forView = (address, name, params=[], options) => {
  const { from='', block, stateAccess, tools } = options
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
    get_address: () => address,
    get_balance: () => balanceOf(address),
    log: console.log,
    importTableName,
    get_msg_name: () => name,
    get_msg_param: () => params.map(x => typeof x === 'number' ? x.toString() : x),
    get_msg_value: () => { throw new Error('Cannot get message value inside a view function') },
    get_sender: () => from,
    now: () => block.timestamp,
    get_block_hash: () => block.hash,
    get_block_number: () => block.number,
    call_contract: (addr, method, params) => {
      return invoker.invokeView(addr, method, params, { ...options, from: address })
    },
    has_state: hasState,
    load: key => getState(key, ''),
    save: setState,
    delete_state: deleteState,
    transfer
  }

  return ctx
}

exports.forPure = (address, name, params=[], { from='' }) => {
  const ctx = {
    address,
    log: console.log,
    get_msg_name: () => name,
    get_msg_param: () => params.map(x => typeof x === 'number' ? x.toString() : x),
    get_sender: () => from
  }

  return ctx
}

exports.forMetadata = {
  log: console.log,
  get_msg_name: () => '__metadata',
  get_msg_param: () => 0,
  get_sender: () => '',
}
