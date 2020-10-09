const axios = require('axios')
const pm2 = require('pm2')
const querystring = require('querystring')
const tendermintName = process.env.TENDERMINT_NAME || 'tendermint'

let timeOut = 0
const httpClient = axios.create({ timeout: 5000 })

const sendTelegramMsg = async () => {
  const options = { text: 'Tendermint process had been killed' }
  const postData = querystring.stringify({
    chat_id: process.env.NEWS_RECEIVER,
    ...options
  })
  const opts = {
    url: `https//api.telegram.org/bot${process.env.BOT_TOKEN}/sendMessage`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': postData.length
    },
    data: postData
  }
  await httpClient.request(opts)
}

httpClient.interceptors.response.use(response => response, async error => {
  if (error.code === 'ECONNABORTED') {
    timeOut += 1
    if (timeOut < 2) {
      return httpClient.request(error.config)
    }
    timeOut = 0
    pm2.sendSignalToProcessName('SIGTERM', tendermintName)
    await sendTelegramMsg()
    return Promise.reject(error)
  }
  return Promise.reject(error)
})

module.exports = httpClient
