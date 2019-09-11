#!/usr/bin/env node

const tm = require('tendermint-node')
const fs = require('fs')
const path = require('path')
const homedir = require('os').homedir()
const { spawn } = require('child_process')
const rimraf = require('rimraf')

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

const initTendemint = (initDir) => {
  tm.initSync(initDir)
  fs.copyFileSync(
    path.resolve(__dirname, './private.toml'),
    path.resolve(initDir, './config/config.toml')
  )
}

program
  .command('init')
  .description('initialize a blockchain node')
  .option('-n, --network <network>', 'network', 'private')
  .action(({ network }, options) => {
    network = getNetwork(network)
    const initDir = `${homedir}/.icetea/${network}`
    initTendemint(initDir)
    console.log(`Init directory created at ${initDir}`)
  })

let node
let instance
program
  .command('start')
  .description('start a blockchain node')
  .option('-n, --network <network>', 'network', 'private')
  .option('-d, --debug', 'debug mode')
  .action(async ({ network, debug }, options) => {
    network = getNetwork(network)

    const initDir = `${homedir}/.icetea/${network}`
    let command = 'node'
    const runOptions = {
      cwd: path.resolve(__dirname, '..')
    }

    if (debug) {
      command = 'ndb'
      runOptions.env = { ...process.env, NODE_ENV: 'development' }
    }

    const indexFile = path.resolve(__dirname, `./${network}.js`)
    const child = spawn(command, [indexFile], runOptions)
    child.stdout.pipe(process.stdout)
    child.stderr.pipe(process.stderr)

    child.on('exit', code => {
      console.log(`ndb exit code is: ${code}`)
    })

    node = tm.node(initDir, {})
    node.stdout.pipe(process.stdout)
  })

program
  .command('reset')
  .description('reset database')
  .option('-n, --network <network>', 'network', 'private')
  .action(async ({ network }, options) => {
    network = getNetwork(network)
    const initDir = `${homedir}/.icetea/${network}`
    const contractSrcDir = path.resolve(__dirname, '../contract_src')
    rimraf.sync(initDir)
    rimraf.sync(contractSrcDir)
    fs.mkdirSync(contractSrcDir)
    fs.closeSync(fs.openSync(`${contractSrcDir}/.gitkeep`, 'w'))
    initTendemint(initDir)
    console.log(`Remove directory at ${initDir} and ${contractSrcDir}`)
  })

program
  .command('app')
  .description('start a blockchain ui for development')
  .option('-h, --host <host>', 'icetea node http or ws', 'http://localhost:26657')
  .action(async ({ host }, options) => {
    const daemon = path.resolve(__dirname, '../node_modules/webpack-dev-server/bin/webpack-dev-server.js')
    const child = spawn(daemon, ['--open', '--config', 'webpack.dev.js'], {
      env: { ...process.env, ICETEA_ENDPOINT: host },
      cwd: path.resolve(__dirname, '..')
    })
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
