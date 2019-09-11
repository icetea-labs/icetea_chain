/**
 * A echo bot, for trying out bot :D
 */

const { checkMsg } = require('../helper/types')

const METADATA = Object.freeze({
  botInfo: {
    decorators: ['pure'],
    params: [],
    returnType: 'object'
  },
  oncommand: {
    decorators: ['pure'],
    params: [
      { name: 'command', type: ['string'] },
      { name: 'options', type: ['any'] }
    ],
    returnType: 'object'
  },
  ontext: {
    decorators: ['pure'],
    params: [
      { name: 'content', type: ['string'] },
      { name: 'options', type: ['any'] }
    ],
    returnType: 'object'
  }
})

// standard contract interface
exports.run = (context) => {
  const { msg } = context.runtime
  const msgParams = checkMsg(msg, METADATA, { sysContracts: this.systemContracts() })

  const contract = {
    botInfo () {
      return {
        specVersion: '1.0', // version of the bot spec
        botVersion: '1.0', // the version of this bot
        stateAccess: 'none',
        name: 'Echo bot',
        description: 'It just echoes what you say, like a parrot.'
      }
    },

    oncommand () {
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

  if (!Object.prototype.hasOwnProperty.call(contract, msg.name)) {
    return METADATA
  } else {
    return contract[msg.name].apply(context, msgParams)
  }
}
