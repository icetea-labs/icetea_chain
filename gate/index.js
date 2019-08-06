/**
 * An MVP gate node.
 */

require('dotenv').config()
const { IceteaWeb3 } = require('@iceteachain/web3')
const fetch = require('node-fetch')

const fetchCmc = data => {
  const url = new URL('https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest')
  url.search = new URLSearchParams(data)
  return fetch(url, {
    headers: {
      Accept: 'application/json',
      'X-CMC_PRO_API_KEY': process.env.CMC_PRO_API_KEY
    }
  }).then(r => r.json())
}

setTimeout(async () => {
  // TODO: move to config
  const tweb3 = new IceteaWeb3('ws://localhost:26657/websocket')

  // TODO: gate contract should be separate from bank contract
  tweb3.wallet.importAccount(process.env.BANK_KEY)

  const gate = tweb3.contract('system.gate')
  const methods = gate.methods

  gate.events.OffchainDataQuery({ emitter: 'system.gate' }, async (error, ev) => {
    if (error) {
      console.error(error)
      return
    }

    console.log('New request: ', ev)

    const requestId = ev.id
    const { path, data } = await methods.getRequest(requestId).call()
    if (path === 'query/finance/crypto/rate') {
      // query coin marketcap
      const r = await fetchCmc(data)

      // build the result as required format by gate
      // TODO: let the caller specify the fields
      const rr = {
        source: 'coinmarketcap.com',
        data: {
          ...r.data[data.symbol].quote
        }
      }

      // set data to contract
      methods.setResult(requestId, rr).sendAsync()
    }
  })

  console.log('Icetea Gate Provider is listening for requests...')
}, 100)
