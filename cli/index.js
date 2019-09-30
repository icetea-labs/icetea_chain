#!/usr/bin/env node

const tm = require('tendermint-node')
const fs = require('fs')
const path = require('path')
const homedir = require('os').homedir()
const { fork, spawn } = require('child_process')
const rimraf = require('rimraf')
const debugFactory = require('debug')
debugFactory.enable('icetea*')
const debug = debugFactory('icetea:cli')

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
    debug(`Init directory created at ${initDir}`)
  })

let node
let instance
program
  .command('start')
  .description('start a blockchain node')
  .option('-n, --network <network>', 'network', 'private')
  .option('-d, --debug', 'debug mode')
  .action(async ({ network, debug: debugMode }, options) => {
    debug(`Prepare to start Icetea. Network: ${network}. Debug mode: ${!!debugMode}`)

    network = getNetwork(network)

    const runOptions = {
      cwd: path.resolve(__dirname, '..')
    }

    const indexFile = path.resolve(__dirname, `./${network}.js`)

    const initDir = `${homedir}/.icetea/${network}`
    const startTm = () => {
      node = tm.node(initDir, {})
      node.stdout.pipe(process.stdout)
      node.stderr.pipe(process.stderr)
      debug(`Iceteamint started, initial directory is ${initDir}`)
      node.on('exit', code => {
        debug(`Iceteamint exit code: ${code}`)
      })
    }

    if (debugMode) {
      instance = spawn('ndb', [indexFile], runOptions)
      instance.stdout.pipe(process.stdout)
      instance.stderr.pipe(process.stderr)
      setTimeout(() => startTm(), 2000)
    } else {
      instance = fork(indexFile, [], runOptions)
      instance.on('message', ({ event } = {}) => {
        if (event === 'listen') {
          startTm()
        }
      })
    }

    instance.on('exit', code => {
      debug(`Icetea${debugMode ? ' debug' : ''} node exit code: ${code}`)

      // handle the case when user click on the (x) button of debug window
      if (debugMode) {
        node && node.kill()
        process.exit(code)
      }
    })
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
    debug(`Directories ${initDir} and ${contractSrcDir} removed.`)
  })

program
  .command('app')
  .description('start a blockchain ui for development')
  .option('-h, --host <host>', 'icetea node http or ws', 'ws://localhost:26657/websocket')
  .action(async ({ host }, options) => {
    const daemon = path.resolve(__dirname, '../node_modules/webpack-dev-server/bin/webpack-dev-server.js')
    const child = spawn(daemon, ['--open', '--config', 'webpack.dev.js'], {
      env: { ...process.env, ICETEA_ENDPOINT: host },
      cwd: path.resolve(__dirname, '..')
    })
    child.stdout.pipe(process.stdout)
    child.stderr.pipe(process.stderr)

    child.on('exit', code => {
      debug(`Web server exit code: ${code}`)
    })
  })

program.parse(process.argv)

process.on('SIGINT', () => {
  // let tm clean-up, or it will lock the DB
  node && node.kill()
})
