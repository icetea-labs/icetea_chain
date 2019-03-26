/**
 * A registry mapping aliases (domains) to addresses.
 *
 * SIMPLE VERSION - WILL IMPROVE LATER
 *
 * Current version only allows register alias for your owned account/contract.
 * No support for UPDATE nor DELETE
 */

const { Alias: ALIAS_ADDR } = require('./BotNames')
const { checkMsg } = require('../helper/types')
const { validateAddress } = require('icetea-common').ecc

const METADATA = {
  'query': {
    decorators: ['view'],
    params: [
      { name: 'textOrRegEx', type: ['string', 'RegExp'] }
    ],
    returnType: ['object', 'Array']
  },
  'resolve': {
    decorators: ['view'],
    params: [
      { name: 'address', type: 'string' }
    ],
    returnType: 'string'
  },
  'register': {
    decorators: ['transaction'],
    params: [
      { name: 'alias', type: 'string' },
      { name: 'address', type: 'string' }
    ],
    returnType: 'string'
  }
}

const ALIAS_KEY = 'alias'

const loadAliases = (context) => {
  return context.getState(ALIAS_KEY, {})
}

const saveAliases = (context, aliases) => {
  return context.setState(ALIAS_KEY, aliases)
}

const isSatisfied = (text, condition) => {
  if (typeof condition.test === 'function') {
    return !!condition.test(text)
  } else if (typeof text.includes === 'function') {
    return !!text.includes(condition)
  }

  return text == condition // eslint-disable-line
}

// standard contract interface
exports.run = (context, options) => {
  const { msg, block } = context.getEnv()
  checkMsg(msg, METADATA)

  const contract = {
    query (textOrRegEx) {
      const aliases = loadAliases(context)

      return Object.keys(aliases).reduce((prev, alias) => {
        if (isSatisfied(alias, textOrRegEx)) {
          prev[alias] = aliases[alias]
        }
        return prev
      }, {})
    },

    resolve (alias) {
      const aliases = loadAliases(context)
      return (aliases[alias] || {}).address
    },

    register (alias, address) {
      alias = alias.trim().toLowerCase()
      if (alias.startsWith('system.')) {
        throw new Error("Alias cannot start with 'system.'.")
      }

      validateAddress(address)

      const isOwnedAccount = msg.sender === address
      if (!isOwnedAccount) {
        let deployedBy
        try {
          deployedBy = options.tools.getCode(address).deployedBy
        } catch (e) {
          throw new Error('The specified address is neither your own account nor a smart contract you deployed.')
        }

        if (deployedBy !== msg.sender) {
          throw new Error('You cannot register for the address you do not own.')
        }
      }

      const prefix = isOwnedAccount ? 'account.' : 'contract.'
      const fullAlias = prefix + alias

      const aliases = loadAliases(context)
      if (aliases.hasOwnProperty(fullAlias)) {
        throw new Error(`Alias ${fullAlias} already registered.`)
      }

      aliases[fullAlias] = {
        address,
        by: msg.sender,
        blockNumber: block.number
      }

      saveAliases(context, aliases)

      return fullAlias
    }
  }

  if (!contract.hasOwnProperty(msg.name)) {
    return METADATA
  } else {
    return contract[msg.name].apply(context, msg.params)
  }
}

exports.resolve = function (alias) {
  const storage = this.unsafeStateManager().getAccountState(ALIAS_ADDR).storage || {}
  const aliases = storage[ALIAS_KEY] || {}
  return (aliases[alias] || {}).address
}

exports.ensureAddress = function (aliasOrAddress) {
  return exports.resolve(aliasOrAddress) || aliasOrAddress
}

exports.getAliases = function () {
  const storage = this.unsafeStateManager().getAccountState(ALIAS_ADDR).storage || {}
  return storage[ALIAS_KEY] || {}
}
