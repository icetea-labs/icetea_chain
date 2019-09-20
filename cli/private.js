require('dotenv').config()
const server = require('abci')
const startup = require('../icetea/app/abcihandler')
const { versions, abciServerPort } = require('../icetea/config')
const semver = require('semver')
const debug = require('debug')('icetea')
const homedir = require('os').homedir()
const network = 'private'

if (!semver.satisfies(process.versions.node, versions.node)) {
  throw new Error(`Icetea requires Node version ${versions.node}, your current version is ${process.versions.node}.`)
}

const initDir = `${homedir}/.icetea/${network}`

startup({ path: `${initDir}/state` }).then(handler => {
  server(handler).listen(abciServerPort, () => {
    debug(`ABCI server listening on port ${abciServerPort}!`)
  })
})
