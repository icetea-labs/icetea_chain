const { ContractMode } = require('icetea-common')
const { resolveExternal } = require('../web/preprocess')
const fs = require('fs')

global.fetch = require('node-fetch')
const LocalStorage = require('node-localstorage').LocalStorage
global.localStorage = new LocalStorage('./localStorage')

const { IceTeaWeb3 } = require('icetea-web3')
const tweb3 = new IceTeaWeb3('ws://localhost:26657/websocket')

async function deploy () {
  const key = 'CJUPdD38vwc2wMC3hDsySB7YQ6AFLGuU6QYQYaiSeBsK'
  const botstore = tweb3.contract('system.botstore', key)

  const check = await botstore.methods.resolve.call(['contract.astrobot'])
  if (!check || !check.success || check.data) return

  // deploy the astrobot
  const src = await resolveExternal(fs.readFileSync('./example/astrobot/astrobot.js', 'utf8'))
  const astrobot = await tweb3.deploy(ContractMode.JS_DECORATED, src, key)

  // add astrobot alias
  const alias = tweb3.contract('system.alias', key)
  await alias.methods.register.sendCommit(['astrobot', astrobot.address])

  // register astrobot with botstore
  await botstore.methods.register.sendCommit(['contract.astrobot', 0, 'https://mangcut.vn/img/mangcut.svg'])
}

(async function () {
  try {
    await deploy()
  } catch (e) {
    console.error(e)
  }
  tweb3.close()
})()
