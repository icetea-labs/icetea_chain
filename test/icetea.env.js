// icetea-environment
const NodeEnvironment = require('jest-environment-node')
const tm = require('tendermint-node')
const createTempDir = require('tempy').directory
const getPort = require('get-port')

const { transpile, setWhiteListModules } = require('@iceteachain/sunseed')
const { whitelistModules } = require('../icetea/config')

setWhiteListModules(whitelistModules)

const createNode = (tm, home, ports) => {
  return tm.node(home, {
    p2p: { laddr: `tcp://0.0.0.0:${ports.p2p}` },
    rpc: { laddr: `tcp://0.0.0.0:${ports.rpc}` },
    proxy_app: `tcp://0.0.0.0:${ports.abci}`
  })
}

class IceteaEnvironment extends NodeEnvironment {
  constructor (config, context) {
    super(config, context)
    this.testPath = context.testPath
  }

  async setup () {
    await super.setup()

    const home = createTempDir()
    tm.initSync(home)
    const ports = {
      p2p: await getPort(),
      rpc: await getPort(),
      abci: await getPort()
    }
    const node = createNode(tm, home, ports)

    this.global.node = node
    this.global.ports = ports
    this.global.transpile = transpile

    this.global.restartNode = async () => {
      await node.kill()
      this.global.node = createNode(tm, home, ports)
    }
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
