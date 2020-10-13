const axios = require('axios')
const pm2 = require('pm2')
const tendermintName = process.env.TENDERMINT_NAME || 'tendermint'
const axiosTimeout = process.env.AXIOS_TIMEOUT || 5000
const { sendDirect } = require('./send')
const debug = require('debug')('icetea:monitor')

let timeOut = 0
const httpClient = axios.create({ timeout: axiosTimeout })

httpClient.interceptors.response.use(response => response, async error => {
  if (error.code === 'ECONNABORTED') {
    timeOut += 1
    if (timeOut < 2) {
      return httpClient.request(error.config)
    }
    timeOut = 0
    pm2.restart(tendermintName, async (err) => {
      if (err) {
        debug(err)
        return
      }
      await sendDirect('Tendermint node being timeout, restart tendermint node')
    })
  }
  return Promise.reject(error)
})

module.exports = httpClient
