// icetea-environment
const NodeEnvironment = require('jest-environment-node')
const tm = require('tendermint-node')
const createTempDir = require('tempy').directory
const getPort = require('get-port')

const { transpile, setWhiteListModules } = require('@iceteachain/sunseed')
const { whitelistModules } = require('../icetea/config')

setWhiteListModules(whitelistModules)

class IceteaEnvironment extends NodeEnvironment {
  constructor (config, context) {
    super(config, context)
    this.testPath = context.testPath
  }

  async setup () {
    await super.setup()

    let home = createTempDir()
    tm.initSync(home)
    const ports = {
      p2p: await getPort(),
      rpc: await getPort(),
      abci: await getPort()
    }
    const node = tm.node(home, {
      p2p: { laddr: `tcp://0.0.0.0:${ports.p2p}` },
      rpc: { laddr: `tcp://0.0.0.0:${ports.rpc}` },
      proxy_app: `tcp://0.0.0.0:${ports.abci}`
    })

    this.global.node = node
    this.global.ports = ports
    this.global.transpile = transpile
  }

  async teardown () {
    await this.global.node.kill()
    await super.teardown()
  }

  runScript (script) {
    return super.runScript(script)
  }
}

module.exports = IceteaEnvironment
