/**
 * Digital identify
 * First version:
 * - owners: list of owner together with weight, default to deployedBy with weight of 1
 * - spendingThreshold: default to 1
 * - does not support anything else yet.
 */

const { checkMsg } = require('../helper/types')

const METADATA = {
  'register': {
    decorators: ['transaction'],
    params: [
      { name: 'address', type: 'string' },
      { name: 'props', type: 'object' }
    ],
    returnType: 'undefined'
  }
}

// standard contract interface
exports.run = (context, options) => {
  const { msg } = context.getEnv()
  checkMsg(msg, METADATA)

  const contract = {
    register (address, props) {
      const alias = exports.systemContracts().Alias
      address = alias.ensureAddress(address)

      if (this.getState(address)) {
        throw new Error("This address is already registered. Call 'update' to update.")
      }
    },

    canTransfer (sigs, to, amount) {

    },

    canReceive (sigs, amount) {

    }
  }

  if (!contract.hasOwnProperty(msg.name)) {
    return METADATA
  } else {
    return contract[msg.name].apply(context, msg.params)
  }
}
