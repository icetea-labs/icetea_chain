const server = require('abci')
const handler = require('./AbciHandler')
const { abciServerPort } = require('./config')

server(handler).listen(abciServerPort, () => {
  console.log(`ABCI server listening on port ${abciServerPort}`)
})
