const axios = require('axios')
const pm2 = require('pm2')
const tendermintName = process.env.TENDERMINT_NAME || 'tendermint'
const { sendDirect } = require('./send')
const debug = require('debug')('icetea:monitor')

let timeOut = 0
const httpClient = axios.create({ timeout: 5000 })

httpClient.interceptors.response.use(response => response, async error => {
  if (error.code === 'ECONNABORTED') {
    timeOut += 1
    if (timeOut < 2) {
      return httpClient.request(error.config)
    }
    timeOut = 0
    pm2.sendSignalToProcessName('SIGTERM', tendermintName, async (err) => {
      if (err) {
        debug(err)
        return
      }
      await sendDirect('Tendermint node being timeout, sending SIGTERM to tendermint node')
    })
  }
  return Promise.reject(error)
})

module.exports = httpClient
