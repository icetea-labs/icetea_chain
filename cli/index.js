#!/usr/bin/env node

const tm = require('tendermint-node')
const fs = require('fs')
const path = require('path')
const homedir = require('os').homedir()
const server = require('abci')
const { spawn } = require('child_process')
const startup = require('../icetea/abcihandler')
const { abciServerPort } = require('../icetea/config')

const program = require('commander')
program.version('0.0.1')

const networks = ['private', 'test', 'main']

const getNetwork = (network) => {
  network = networks.includes(network) ? network : 'private'
  if (network === 'test' || network === 'main') {
    throw new Error('Network is not supported currently')
  }
  return network
}

program
  .command('init')
  .description('initialize a blockchain node')
  .option('-n, --network [network]', 'network')
  .action(({ network }, options) => {
    network = getNetwork(network)

    const initDir = `${homedir}/.icetea/${network}`
    tm.initSync(initDir)
    fs.copyFileSync(
      path.resolve(__dirname, './private.toml'),
      path.resolve(initDir, './config/config.toml')
    )

    console.log(`Init directory created at ${initDir}`)
  })

let node
let instance
program
  .command('start')
  .description('start a blockchain node')
  .option('-n, --network [network]', 'network')
  .option('-d, --debug', 'debug mode')
  .action(async ({ network, debug }, options) => {
    network = getNetwork(network)

    const initDir = `${homedir}/.icetea/${network}`

    if (debug) {
      const indexFile = path.resolve(__dirname, `./${network}.js`)
      const child = spawn('ndb', [indexFile])
      child.stdout.pipe(process.stdout)
      child.stderr.pipe(process.stderr)

      child.on('exit', code => {
        console.log(`ndb exit code is: ${code}`)
      })
    } else {
      const handler = await startup({ path: `${initDir}/state` })
      instance = server(handler)
      instance.listen(abciServerPort)
    }
    node = tm.node(initDir, {})
    node.stdout.pipe(process.stdout)
  })

program
  .command('app')
  .description('start a blockchain ui for development')
  .action(async (options) => {
    const configFile = path.resolve(__dirname, '../webpack.dev.js')
    const child = spawn('webpack-dev-server', ['--open', '--config', configFile])
    child.stdout.pipe(process.stdout)
    child.stderr.pipe(process.stderr)

    child.on('exit', code => {
      console.log(`Exit code is: ${code}`)
    })
  })

program.parse(process.argv)

process.on('SIGINT', () => {
  node && node.kill()
  instance && instance.close()
})
