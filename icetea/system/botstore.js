/**
 * Register a bot to display on botstore
 * Info needed:
 * - alias: must have alias
 * - name: obtained from bot
 * - description: obtained from bot
 * - localization: not supported yet
 * - icon: anything that works with <img src='here'>, including SVG data, external URL, etc.
 * - category: one of predefine category: Business, Education, Entertainment, Finance, Games, Lifestyle, Communication, Utilities
 */

const { checkMsg } = require('../helper/types')
const { initialBotStore } = require('../config')
const _ = require('lodash')

const METADATA = {
  'query': {
    decorators: ['view'],
    params: [],
    returnType: 'object'
  },
  'resolve': {
    decorators: ['view'],
    params: [
      { name: 'name', type: 'string' }
    ],
    returnType: 'object'
  },
  'register': {
    decorators: ['transaction'],
    params: [
      { name: 'name', type: 'string' },
      { name: 'category', type: 'number' },
      { name: 'icon', type: ['string', 'undefined'] },
      { name: 'overwrite', type: ['boolean', 'undefined'] }
    ],
    returnType: 'string'
  }
}

const KEY = 'store'

const getStore = (context) => {
  return context.getState(KEY, {})
}

const saveStore = (context, store) => {
  return context.setState(KEY, store)
}

exports.ondeploy = state => {
  if (initialBotStore) {
    state.storage = {
      [KEY]: {}
    }
    Object.assign(state.storage[KEY], initialBotStore)
  }

  return state
}

// standard contract interface
exports.run = (context, options) => {
  const { msg } = context.getEnv()
  checkMsg(msg, METADATA)

  const contract = {
    query () {
      return _.cloneDeep(getStore(context))
    },

    resolve (name) {
      const store = getStore(context)
      return _.cloneDeep(store[name])
    },

    register (name, category, icon, overwrite = false) {
      const alias = exports.systemContracts().Alias
      const address = alias.resolve(name)

      if (!address) {
        throw new Error('Require a bot alias. You must register an alias for your bot first.')
      }

      const isOwnedAccount = msg.sender === address
      if (!isOwnedAccount) {
        let deployedBy
        try {
          deployedBy = options.tools.getCode(address).deployedBy
        } catch (e) {
          throw new Error('The specified bot is neither one of your own accounts nor a smart contract you deployed.')
        }

        if (deployedBy !== msg.sender) {
          throw new Error('You cannot register a bot you do not own.')
        }
      }

      const store = getStore(context)
      if (!overwrite && store.hasOwnProperty(name)) {
        throw new Error(`Bot ${name} already registered.`)
      }

      store[name] = {
        category
      }
      if (icon) {
        store[name].icon = icon
      }

      saveStore(context, store)

      return name
    }
  }

  if (!contract.hasOwnProperty(msg.name)) {
    return METADATA
  } else {
    return contract[msg.name].apply(context, msg.params)
  }
}
