const { ContractMode } = require('icetea-common')
const { resolveExternal } = require('../web/preprocess')
const fs = require('fs')

global.fetch = require('node-fetch')

const { IceTeaWeb3 } = require('icetea-web3')
const tweb3 = new IceTeaWeb3('ws://localhost:26657/websocket')

async function deploy () {
  const key = 'CJUPdD38vwc2wMC3hDsySB7YQ6AFLGuU6QYQYaiSeBsK'
  tweb3.wallet.importAccount(key)
  const botstore = tweb3.contract('system.botstore')

  const check = await botstore.methods.resolve('contract.astrobot').call()
  if (!check || !check.success || check.data) return

  // deploy the astrobot
  const src = await resolveExternal(fs.readFileSync('./example/astrobot/astrobot.js', 'utf8'))
  const astrobot = await tweb3.deploy(ContractMode.JS_DECORATED, src)

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
