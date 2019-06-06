/**
 * An MVP gate node.
 */

require('dotenv').config()
const { IceteaWeb3 } = require('@iceteachain/web3')

setTimeout(async () => {
  const tweb3 = new IceteaWeb3('ws://localhost:26657/websocket')
  tweb3.wallet.importAccount(process.env.BANK_KEY)

  tweb3.subscribe('OffchainDataQuery', {}, async data => {
    const { result: ev } = JSON.parse(data)
    if (ev.emitter !== 'system.gate') {
      return
    }

    const ms = tweb3.contract('system.gate').methods

    const requestId = ev.eventData.id
    const { path } = await ms.getRequest(requestId).call()
    if (path === 'lottery') {
      const r = [
        [34641],
        [56596],
        [81188, 95672],
        [13683, 44507, 57885],
        [99753, 72552, 85043],
        [3194, 7018, 6023, 5632],
        [6205, 2598, 5631],
        [4785, 1752, 7941],
        [520, 759, 474],
        [93, 81, 63, 54]
      ]
      tweb3.contract('system.gate').methods.setResult(requestId, r).sendAsync()
    }
  })
}, 5000)
