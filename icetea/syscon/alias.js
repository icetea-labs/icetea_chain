/**
 * A registry mapping aliases to addresses.
 * This is 1-1 mapping. Think of it like username rather than DNS.
 * To register for a address, you must be one of its owners.
 */

const { Alias: ALIAS_ADDR } = require('./sysconnames')
const { checkMsg } = require('../helper/types')

const METADATA = Object.freeze({
  query: {
    decorators: ['view'],
    params: [
      { name: 'partOfAlias', type: ['string', 'RegExp'] },
      { name: 'options', type: ['object', 'undefined'] }
    ],
    returnType: ['object']
  },
  resolve: {
    decorators: ['view'],
    params: [
      { name: 'alias', type: 'string' }
    ],
    returnType: 'string'
  },
  byAddress: {
    decorators: ['view'],
    params: [
      { name: 'address', type: 'pureaddress' }
    ],
    returnType: ['string', 'undefined']
  },
  byAddressArray: {
    decorators: ['view'],
    params: [
      { name: 'addressArray', type: 'Array' }
    ],
    returnType: 'Array'
  },
  register: {
    decorators: ['transaction'],
    params: [
      { name: 'alias', type: 'string' },
      { name: 'address', type: ['pureaddress', 'undefined'] },
      { name: 'overwrite', type: ['boolean', 'undefined'] }
    ],
    returnType: 'string'
  }
})

const ALIAS_KEY = 'alias'
const ADDR_KEY = 'addr2alias'

const loadAliases = (context) => {
  return context.getState(ALIAS_KEY, {})
}

const saveAliases = (context, aliases) => {
  return context.setState(ALIAS_KEY, aliases)
}

const loadAddrMap = (context) => {
  return context.getState(ADDR_KEY, {})
}

const saveAddrMap = (context, map) => {
  return context.setState(ADDR_KEY, map)
}

const isSatisfied = (text, condition) => {
  if (typeof condition.test === 'function') {
    return !!condition.test(text)
  } else if (typeof text.includes === 'function') {
    return !!text.includes(condition)
  }

  // should never reach here
  // return text == condition // eslint-disable-line
}

const sanitizeAlias = (alias) => {
  alias = alias.trim().toLowerCase()
  if (!/^[a-z0-9][a-z0-9_-]{1,61}[a-z0-9](?:\.[a-z]{2,})*$/.test(alias)) {
    throw new Error(`Invalid alias '${alias}', make sure it does not contain invalid characters and has appropriate length.`)
  }
  return alias
}

// standard contract interface
exports.run = (context, options) => {
  const { msg, block } = context.runtime
  const msgParams = checkMsg(msg, METADATA, { sysContracts: this.systemContracts() })

  const contract = {
    query (textOrRegEx, { includeTags = false, maxItems = 10 } = {}) {
      const aliases = loadAliases(context)
      const did = includeTags ? exports.systemContracts().Did : undefined
      let count = 0
      return Object.keys(aliases).reduce((prev, alias) => {
        if (count < maxItems && isSatisfied(alias, textOrRegEx)) {
          const item = aliases[alias]
          if (includeTags) {
            const info = did.query(aliases[alias].address)
            info && info.tags && (item.tags = info.tags)
          }
          count++
          prev[alias] = item
        }
        return prev
      }, {})
    },

    resolve (alias) {
      const aliases = loadAliases(context)
      return (aliases[alias] || {}).address
    },

    byAddress (address) {
      const map = loadAddrMap(context)
      return map[address]
    },

    byAddressArray (addressArray) {
      const map = loadAddrMap(context)
      return addressArray.reduce((r, addr) => {
        r.push(map[addr])
        return r
      }, [])
    },

    register (alias, address, overwrite = false) {
      alias = sanitizeAlias(alias)
      if (alias.startsWith('system.') || alias.startsWith('account.') || alias.startsWith('contract.')) {
        throw new Error("Alias cannot start with 'system.', 'account.', or 'contract.'.")
      }

      if (address == null) {
        address = msg.sender
      }

      const validateAddressOwner = (address) => {
        const did = exports.systemContracts().Did
        const checkPerm = address =>
          did.checkPermissionFromContract(address, context)

        try {
          checkPerm(address)
          return true
        } catch (e) {
          let deployedBy
          try {
            deployedBy = options.tools.getCode(address).deployedBy
          } catch (e2) {
            throw new Error('You do not have permission to register this alias.')
          }

          checkPerm(deployedBy)
          return false
        }
      }

      let isOwnedAccount = (address === msg.sender)
      if (!isOwnedAccount) {
        // this is not like DNS where anyone can map a domain to your address
        isOwnedAccount = validateAddressOwner(address)
      }

      const prefix = isOwnedAccount ? 'account.' : 'contract.'
      const fullAlias = prefix + alias

      const aliases = loadAliases(context)
      const oldAddress = aliases[fullAlias]

      // we don't support 'renew'
      if (oldAddress && (oldAddress.address === address)) return

      if (oldAddress) {
        if (!overwrite) {
          throw new Error(`${fullAlias} already maps to ${oldAddress.address}. Specify 'overwrite' argument if you want to overwrite.`)
        } else {
          // need to check whether caller own this alias before updating
          validateAddressOwner(oldAddress.address)
        }
      }

      const map = loadAddrMap(context)
      const oldAlias = map[address]

      if (oldAlias && !overwrite) {
        throw new Error(`${address} already maps to ${oldAlias}. Specify 'overwrite' argument if you want to overwrite.`)
      }

      // alias to address
      aliases[fullAlias] = {
        address,
        by: msg.sender,
        blockNumber: block.number
      }
      saveAliases(context, aliases)

      // address to alias
      map[address] = fullAlias
      if (oldAddress) {
        delete map[oldAddress.address]
      }
      saveAddrMap(context, map)

      return fullAlias
    }
  }

  if (!Object.prototype.hasOwnProperty.call(contract, msg.name)) {
    return METADATA
  } else {
    return contract[msg.name].apply(context, msgParams)
  }
}

exports.resolve = function (alias) {
  const storage = this.unsafeStateManager().getAccountState(ALIAS_ADDR).storage || {}
  const aliases = storage[ALIAS_KEY] || {}
  return (aliases[alias] || {}).address
}

exports.byAddress = function (address) {
  const storage = this.unsafeStateManager().getAccountState(ALIAS_ADDR).storage || {}
  const map = storage[ADDR_KEY] || {}
  return map[address]
}

exports.byAddressArray = function (addressArray) {
  const storage = this.unsafeStateManager().getAccountState(ALIAS_ADDR).storage || {}
  const map = storage[ADDR_KEY] || {}
  const initialR = []
  initialR.aliasCount = 0
  return addressArray.reduce((r, addr) => {
    const alias = map[addr]
    r.push(alias)
    if (alias) r.aliasCount++
    return r
  }, initialR)
}

exports.ensureAddress = function (aliasOrAddress) {
  return exports.resolve(aliasOrAddress) || aliasOrAddress
}

exports.getAliases = function () {
  const storage = this.unsafeStateManager().getAccountState(ALIAS_ADDR).storage || {}
  return storage[ALIAS_KEY] || {}
}
