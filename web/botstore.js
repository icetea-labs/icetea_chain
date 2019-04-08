
import tweb3 from './tweb3'
import handlebars from 'handlebars/dist/handlebars.min.js'
import $ from 'jquery'
window.$ = $

const storeTemplate = handlebars.compile(document.getElementById('storeTemplate').innerHTML)

const initWeb3 = (showAlert = true) => {
  try {
    var resp = tweb3.wallet.loadFromStorage('123')
    if (resp === 0) {
      window.alert('Wallet empty! Please go to Wallet tab to create account.')
      return
    }
    return true
  } catch (error) {
    console.error(error)
    const err = 'Please go to Wallet tab to create or import one first.'
    showAlert && window.alert(err)
    return false
  }
}
let web3Inited = initWeb3(false)

$(document).ready(function () {
  store.initStore()
  console.log(web3Inited)
  document.getElementById('category').addEventListener('change', async function () {
    var arrFilter = store.bots
    var category = parseInt(document.getElementById('category').value)
    // All = 9
    if (category !== 9) {
      arrFilter = arrFilter.filter(el => {
        return el.category === category
      })
    }
    store.render(arrFilter)
  }, false)
})
var bots = {}
const store = {
  set bots (value) {
    bots = value
  },
  get bots () {
    return bots
  },
  initStore: async function () {
    var arrBot = await store.getBotList()
    var storeBots = await store.getBotInfo(arrBot)
    store.bots = storeBots
    store.render(storeBots)
  },
  getBotList: async function () {
    var address = 'system.botstore'
    const contract = tweb3.contract(address)
    const arrbots = await contract.methods.query().call()
    return arrbots
  },
  getBotInfo: async function (bots) {
    var resInfo = []
    var keys = Object.keys(bots)
    for (let bot of keys) {
      var botInfo = { address: '', category: 'category', name: 'name', icon: 'icon', description: 'description' }
      const contract = tweb3.contract(bot)
      const info = await contract.methods.botInfo().callPure()
      botInfo.address = bot
      botInfo.category = bots[bot].category
      botInfo.icon = bots[bot].icon
      botInfo.name = info.name
      botInfo.alias = bot.split('.', 2)[1]
      botInfo.description = info.description || ''
      if (botInfo.description.length > 36) {
        botInfo.description = botInfo.description.substring(0, 36) + '…'
      }
      resInfo.push(botInfo)
    }
    return resInfo
  },
  render: function (storeBot) {
    document.getElementById('store').innerHTML = storeTemplate(storeBot)
  }
}

window.connectBot = function (event) {
  var address = encodeURIComponent(event.id)
  var url = '/botpoup.html' + '?address=' + address
  popupwindow(url, 'title', 800, 600)
  // window.alert(event.id)
}

function popupwindow (url, title, w, h) {
  var left = (window.screen.width / 2) - (w / 2)
  var top = (window.screen.height / 2) - (h / 2)
  return window.open(url, title, 'toolbar=no, location=no, directories=no, status=no, menubar=no, scrollbars=no, resizable=no, copyhistory=no, width=' + w + ', height=' + h + ', top=' + top + ', left=' + left)
}
