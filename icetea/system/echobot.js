/**
 * A echo bot, for trying out bot :D
 */

const { checkMsg } = require('../helper/types')

const METADATA = {
  'botInfo': {
    decorators: ['pure'],
    params: [],
    returnType: 'object'
  },
  'onstart': {
    decorators: ['pure'],
    params: [],
    returnType: 'object'
  },
  'ontext': {
    decorators: ['pure'],
    params: [
      { name: 'content', type: ['string'] }
    ],
    returnType: 'object'
  }
}

// standard contract interface
exports.run = (context) => {
  const { msg } = context.getEnv()
  checkMsg(msg, METADATA)

  const contract = {
    botInfo () {
      return {
        spec_version: '1.0', // version of the bot spec
        bot_version: '1.0', // the version of this bot
        state_access: 'none',
        name: 'Echo bot',
        description: 'It just echoes what you say, like a parrot.'
      }
    },

    onstart () {
      return contract.ontext('Start')
    },

    ontext (content) {
      return [{
        type: 'text',
        content
      }, {
        type: 'input',
        content: {
          placeholder: 'Say something'
        }
      }]
    }
  }

  if (!contract.hasOwnProperty(msg.name)) {
    return METADATA
  } else {
    return contract[msg.name].apply(context, msg.params)
  }
}
