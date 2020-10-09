const axios = require('axios')
const pm2 = require('pm2')
const tendermintName = process.env.TENDERMINT_NAME || 'tendermint'

let timeOut = 0
const httpClient = axios.create({ timeout: 5000 })

httpClient.interceptors.response.use(response => response, async error => {
  if (error.code === 'ECONNABORTED') {
    timeOut += 1
    if (timeOut < 2) {
      return httpClient.request(error.config)
    }
    timeOut = 0
    pm2.sendSignalToProcessName('SIGTERM', tendermintName)
  }
  return Promise.reject(error)
})

module.exports = httpClient
