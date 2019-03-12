/**
 * A registry mapping aliases to addresses.
 */

const { checkMsg } = require('../helper/types')

const METADATA = {
  'query': {
    decorators: ['view'],
    params: [
      { name: 'textOrRegEx', type: ['string', 'object'] }
    ],
    returnType: 'array'
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
      { name: 'address', type: 'string' },
      { name: 'alias', type: 'string' }
    ],
    returnType: 'undefined'
  }
}

// standard contract interface
exports.run = (context) => {
  const { msg } = context.getEnv()
  checkMsg(msg, METADATA)

  const contract = {
    query () {
    },

    request () {
    },

    withdraw () {
    }
  }

  if (!contract.hasOwnProperty(msg.name)) {
    return METADATA
  } else {
    return contract[msg.name].apply(context, msg.params)
  }
}
