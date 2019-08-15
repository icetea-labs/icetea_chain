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

const fetchOpenWeather = data => {
  if (data.locale && !data.lang) {
    // OpenWeather require a different format of locale
    const lang = data.locale.toLowerCase().replace('_', '-')
    data.lang = lang
    delete data.locale
  }
  const url = new URL('https://api.openweathermap.org/data/2.5/weather')
  url.search = new URLSearchParams({
    'APPID': process.env.OPEN_WEATHER_API_KEY,
    ...data
  })
  return fetch(url, {
    headers: {
      Accept: 'application/json'
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

  gate.events.OffchainDataQuery({ /* from: 'system.gate' */}, async (error, ev) => {
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
    } else if (path === 'query/weather/current') {
      // query coin marketcap
      const r = await fetchOpenWeather(data)

      console.log(r)

      // build the result as required format by gate
      // TODO: let the caller specify the fields
      const rr = {
        source: 'openweathermap.org',
        data: {
          weather: {
            main: r.weather[0].main,
            description: r.weather[0].description,
            icon: `https://openweathermap.org/img/wn/${r.weather[0].icon}@2x.png`
          },
          main: r.main,
          visibility: r.visibility,
          wind: r.wind.speed,
          clouds: r.clouds.all,
          country: r.sys.country,
          timezone: r.timezone,
          location: r.name,
          coord: r.coord,
          timestamp: r.dt
        }
      }

      // set data to contract
      methods.setResult(requestId, rr).sendAsync()
    }
  })

  console.log('Icetea Gate Provider is listening for requests...')
}, 100)
