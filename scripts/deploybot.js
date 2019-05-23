require('dotenv').config()
const { ContractMode } = require('icetea-common')
const { resolveExternal } = require('../web/preprocess')
const fs = require('fs')

global.fetch = require('node-fetch')

let botName = 'dice'
let botFile = 'dice.js'
if (process.argv.length > 2) {
  botName = process.argv[2]
  if (process.argv.length > 3) {
    botFile = process.argv[3]
  } else {
    botFile = botName + '.js'
  }
}
botFile = './example/bot/' + botFile

const { IceTeaWeb3 } = require('icetea-web3')
const tweb3 = new IceTeaWeb3('ws://localhost:26657/websocket')

async function deploy () {
  const key = process.env.BANK_KEY
  tweb3.wallet.importAccount(key)
  const botstore = tweb3.contract('system.botstore')

  // deploy the astrobot
  const src = await resolveExternal(fs.readFileSync(botFile, 'utf8'))
  const theBot = await tweb3.deploy(ContractMode.JS_DECORATED, src, [], { value: 10000e6 })

  // add astrobot alias
  const alias = tweb3.contract('system.alias', key)
  const oldBot = await alias.methods.resolve('contract.' + botName).call()
  if (oldBot) {
    console.log(`${botName} already registed to point to ${oldBot}`)
    botName = botName + '_' + Date.now().toString(36).substr(-4)
    console.log('Use new bot name: ' + botName)
  }
  await alias.methods.register(botName, theBot.address).sendCommit()

  // register astrobot with botstore
  const existed = await botstore.methods.resolve('contract.' + botName).call()
  if (!existed) {
    const avatar = 'http://i.pravatar.cc/150?img=' + (Date.now() % 70 + 1)
    await botstore.methods.register('contract.' + botName, 0, avatar).sendCommit()
  }
}

(async function () {
  try {
    await deploy()
  } catch (e) {
    console.error(e)
  }
  tweb3.close()
})()
