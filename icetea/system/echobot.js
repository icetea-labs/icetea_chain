/**
 * A echo bot, for trying out bot :D
 */

const { checkMsg } = require('../helper/types')

const METADATA = {
  'info': {
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
    info () {
      return {
        spec_version: '1.0', // version of the bot spec
        bot_version: '1.0', // the version of this bot
        ontext_type: 'pure',
        name: 'Echo bot',
        description: 'It just echoes what you say, like a parrot.'
      }
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
