require('dotenv').config()
const server = require('abci')
const startup = require('./AbciHandler')
const { abciServerPort } = require('./config')

startup().then(handler => {
  server(handler).listen(abciServerPort, () => {
    console.log(`ABCI server listening on port ${abciServerPort}\nDon't forget to start/restart tendermint node!`)
  })
})
