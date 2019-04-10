const pm2 = require('pm2')
const iceteaName = process.env.ICETEA_NAME || 'icetea'
const tendermintName = process.env.TENDERMINT_NAME || 'tendermint'

pm2.launchBus(function (err, bus) {
  if (err) {
    console.error(err)
    return
  }
  bus.on('process:event', function (data) {
    if (data.event === 'exit') {
      const name = data.process.name
      if (name === iceteaName) {
        console.log('Icetea is exitting, send SIGTERM to tendermint')
        pm2.sendSignalToProcessName('SIGTERM', tendermintName)
      }
    }
  })
})
