require('dotenv').config()
const fs = require('fs')
const { whitelistModules } = require('../icetea/config')
const { transpile, setWhiteListModules } = require('@iceteachain/sunseed')

global.fetch = require('node-fetch')
setWhiteListModules(whitelistModules)

const { IceteaWeb3 } = require('@iceteachain/web3')
const tweb3 = new IceteaWeb3('ws://localhost:26657/websocket')

async function deploy () {
  const key = process.env.BANK_KEY
  tweb3.wallet.importAccount(key)
  const botstore = tweb3.contract('system.botstore')

  const check = await botstore.methods.resolve('contract.astrobot').call()
  if (check) return

  // deploy the astrobot
  const src = await transpile(fs.readFileSync('./example/bot/astrobot/astrobot.js', 'utf8'), { prettier: true })
  const astrobot = await tweb3.deploy(src)

  // add astrobot alias
  const alias = tweb3.contract('system.alias', key)
  await alias.methods.register('astrobot', astrobot.address).sendCommit()

  // register astrobot with botstore
  await botstore.methods.register('contract.astrobot', 0, 'https://mangcut.vn/img/mangcut.svg').sendCommit()
}

(async function () {
  try {
    await deploy()
  } catch (e) {
    console.error(e)
  }
  tweb3.close()
})()
