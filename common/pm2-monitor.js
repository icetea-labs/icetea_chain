const pm2 = require('pm2')
require('dotenv').config()
const iceteaName = process.env.ICETEA_NAME || 'icetea'
const tendermintName = process.env.TENDERMINT_NAME || 'tendermint'
const scheduleTime = process.env.SCHEDULE_TIME || '*/5 * * * *'
const debug = require('debug')('icetea:monitor')
const schedule = require('node-schedule')
const { healthCheck } = require('./healthCheckTendermint')
const { sendDirect } = require('./send')

pm2.launchBus(function (err, bus) {
  if (err) {
    debug(err)
    return
  }
  schedule.scheduleJob(scheduleTime, healthCheck)

  bus.on('process:event', function (data) {
    if (data.event === 'exit') {
      const name = data.process.name
      if (name === iceteaName) {
        debug('Icetea node exited, sending SIGTERM to tendermint node')
        pm2.sendSignalToProcessName('SIGTERM', tendermintName, async (err) => {
          if (err) {
            debug(err)
            return
          }
          if (data.process.status === 'stopped') {
            await sendDirect('Icetea node exited, sending SIGTERM to tendermint node')
          }
        })
      }
    }
  })
})
