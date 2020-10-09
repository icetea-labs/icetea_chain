const pm2 = require('pm2')
const iceteaName = process.env.ICETEA_NAME || 'icetea'
const tendermintName = process.env.TENDERMINT_NAME || 'tendermint'
const debug = require('debug')('icetea:monitor')
const schedule = require('node-schedule')
const { healthCheck } = require('./healthCheckTendermint')

pm2.launchBus(function (err, bus) {
  if (err) {
    debug(err)
    return
  }
  schedule.scheduleJob('1 * * * *', healthCheck)

  bus.on('process:event', function (data) {
    if (data.event === 'exit') {
      const name = data.process.name
      if (name === iceteaName) {
        debug('Icetea node exited, sending SIGTERM to tendermint node')
        pm2.sendSignalToProcessName('SIGTERM', tendermintName)
      }
    }
  })
})
