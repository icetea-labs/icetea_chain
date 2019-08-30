
import tweb3 from './tweb3'
import handlebars from 'handlebars/dist/handlebars.min.js'
import $ from 'jquery'
window.$ = $

const storeTemplate = handlebars.compile(document.getElementById('storeTemplate').innerHTML)

const initWeb3 = async (showAlert = true) => {
  try {
    var resp = await tweb3.wallet.loadFromStorage('123', undefined, tweb3.wallet.defaultAccount)
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

initWeb3(false)

$(document).ready(function () {
  store.initStore()
  document.getElementById('category').addEventListener('change', async function () {
    var arrFilter = store.bots
    var category = parseInt(document.getElementById('category').value)
    // All = 9
    if (category !== '') {
      arrFilter = arrFilter.filter(el => {
        return el.category === category
      })
    }
    store.render(arrFilter)
  }, false)

  fillContracts()
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
    for (const bot of keys) {
      try {
        const botInfo = { address: '', category: 'category', name: 'name', icon: 'icon', description: 'description' }
        const contract = tweb3.contract(bot)
        const info = await contract.methods.botInfo().callPure().catch(console.error)
        botInfo.address = bot
        botInfo.category = bots[bot].category
        botInfo.icon = bots[bot].icon
        botInfo.name = bots[bot].name || info.name
        botInfo.bot = bot
        botInfo.alias = bot.split('.', 2)[1]
        botInfo.description = bots[bot].description || info.description || ''
        if (botInfo.description.length > 36) {
          botInfo.description = botInfo.description.substring(0, 36) + '...'
        }
        resInfo.push(botInfo)
      } catch (error) {
        console.error(error)
        console.log('Skip error bot: ' + bot)
      }
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

$('#rndImg').on('click', function (e) {
  e.preventDefault()
  const sampleUrl = 'http://i.pravatar.cc/150?img=' + (Date.now() % 70 + 1)
  $('#iconUrl').val(sampleUrl)
})

$('#toggleRegForm').on('click', function (e) {
  e.preventDefault()
  $('#form').toggleClass('hide')
})

$('#botAddress').on('change', async function () {
  this.querySelector("option[value='']").remove()

  const addr = $(this).val()
  const $a = $('#botAlias')

  if (addr.includes('.')) {
    $a.val('').prop('disabled', true).prop('required', false)
    const storeInfo = await tweb3.contract('system.botstore').methods.resolve(addr).call()
    if (storeInfo) {
      $('#botCat').val('' + (storeInfo.category || 0))
      $('#iconUrl').val(storeInfo.icon || '')
    }
  } else {
    $a.prop('disabled', false).prop('required', true)
  }

  const info = botCandidates[addr]
  $('#botName').text(info.name)
  $('#botDesc').text(info.description)
})

$('#form').on('submit', async function (e) {
  e.preventDefault()
  const data = $(this).serializeArray()
    .reduce(function (a, x) { a[x.name] = x.value.trim(); return a }, {})
  data.category = +data.category

  try {
    if (data.address.includes('.')) {
      data.alias = data.address
    } else {
      if (!data.alias.startsWith('contract.')) {
        data.alias = 'contract.' + data.alias
      }

      // register the alias
      await tweb3.contract('system.alias').methods.register(data.alias.split('.', 2)[1], data.address).sendCommit()
    }

    await tweb3.contract('system.botstore').methods.register(data.alias, data.category, data.icon, true).sendCommit()

    window.location.reload()
  } catch (err) {
    window.alert(String(err))
  }
})

const botCandidates = {}
async function fillContracts () {
  try {
    const contracts = await tweb3.getContracts(true)

    if (!contracts.length) return

    var select = document.getElementById('botAddress')
    contracts.forEach(item => {
      if (!item.startsWith('system.')) {
        tweb3.contract(item).methods.botInfo().callPure()
          .then(info => {
            botCandidates[item] = info
            const option = document.createElement('option')
            option.value = item
            option.textContent = item
            select.appendChild(option)
          })
          .catch(() => undefined)
      }
    })
  } catch (error) {
    console.log(error)
    window.alert(String(error))
  }
}
