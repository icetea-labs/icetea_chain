import Vue from 'vue'
import BotUI from 'botui'
import tweb3 from './tweb3'

const initWeb3 = (showAlert = true) => {
  try {
    var resp = tweb3.wallet.loadFromStorage('123')
    if (resp === 0) {
      window.alert('Wallet empty! Please go to Wallet tab to create account.')
      return
    }
    byId('address').textContent = tweb3.wallet.defaultAccount
    return true
  } catch (error) {
    console.error(error)
    const err = 'Please go to Wallet tab to create or import one first.'
    byId('address').textContent = err
    showAlert && window.alert(err)
    return false
  }
}
let web3Inited = initWeb3(false)

const botui = BotUI('my-botui-app', {
  vue: Vue
})

const say = (text, options) => {
  botui.message.add(Object.assign({ content: String(text) }, options || {}))
}

/**
 * generate buttons
 * @param {string} action array of button title
 */
const sayButton = (action) => {
  if (!Array.isArray(action)) {
    action = [action]
  }
  return botui.action.button({ action })
}

const saySelect = (action) => {
  return botui.action.select({ action })
}

const speak = items => {
  if (!items) return
  if (!Array.isArray(items)) {
    items = [items]
  }
  if (!items.length) return

  return items.reduce((prev, item) => {
    if (typeof item === 'string') {
      return say(item)
    }

    item.type = item.type || 'text'
    switch (item.type) {
      case 'text':
      case 'html':
        return botui.message.add(item)
      case 'input':
        return botui.action.text({
          action: item.content
        })
      case 'button':
        return sayButton(item.content)
      case 'select':
        return saySelect(item.content)
    }
  }, undefined)
}

/**
 * get element by id
 * @param {string} id element id
 */
function byId (id) {
  return document.getElementById(id)
}

// function json (o) {
//   try {
//     return JSON.stringify(o)
//   } catch (e) {
//     return String(o)
//   }
// }

function fmtNum (n) {
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 9
  })
}

function confirmTransfer (amount) {
  say(`ATTENTION: you are about to transfer <b>${fmtNum(amount)}</b> TEA to this bot.`, {
    type: 'html', cssClass: 'bot-intro'
  })
  return sayButton([
    { text: 'Let\'s transfer', value: 'transfer' },
    { text: 'No way', value: 'no' }
  ]).then(result => (result && result.value === 'transfer'))
}

async function callContract (method, type, value, from, ...params) {
  const map = {
    'none': 'callPure',
    'read': 'call',
    'write': 'sendCommit'
  }

  const result = await method(...params)[map[type]]({ value, from })

  if (type === 'write') {
    return result.result
  } else {
    return result
  }
}

/**
 * connect to bot smart contract
 * @param {string} botAddr bot smart contract address
 */
async function connectBot (botAddr) {
  if (!web3Inited) {
    web3Inited = initWeb3()
  }
  if (!web3Inited) return

  // if (!botAddr) botAddr = byId('bot_address').value.trim()
  const contract = tweb3.contract(botAddr)

  // get bot info
  const botInfo = await contract.methods.botInfo().callPure()
  const commands = await contract.methods.getCommands().callPure()

  if (!botInfo.state_access) {
    const meta = await tweb3.getMetadata(botAddr)
    if (meta && meta.ontext && meta.ontext.decorators && meta.ontext.decorators.length > 0) {
      const deco = meta.ontext.decorators[0]
      if (deco === 'transaction' || deco === 'payable') {
        botInfo.state_access = 'write'
      } else if (deco === 'pure') {
        botInfo.state_access = 'none'
      } else {
        botInfo.state_access = 'read'
      }
    } else {
      botInfo.state_access = 'read'
    }
  } else if (!['read', 'write', 'none'].includes(botInfo.state_access)) {
    window.alert('Cannot connect to this bot. It has an invalid state access specifier.')
    return
  }

  !botInfo.name && (botInfo.name = botAddr)
  !botInfo.description && (botInfo.description = 'N/A')

  botui.message.removeAll()

  // display bot info
  await say(`<b>${botInfo.name}</b><br>${botInfo.description}`, { type: 'html', cssClass: 'bot-intro' })
  await botui.message.bot('What would you like to do?')

  // display Start button
  let result = await sayButton(commands.map(command => ({ text: command.title, value: command.value })))
  let callResult
  let isFirst = true
  let sendback = null
  let stateAccess = botInfo.state_access
  while (result && result.value) {
    let transferValue = 0
    if (callResult && callResult.options && callResult.options.value) {
      const ok = await confirmTransfer(callResult.options.value) // should confirm at wallet level
      if (!ok) {
        say('Transfer canceled. You could reconnect to this bot to start a new conversation.')
        return
      }
      transferValue = callResult.options.value
      transferValue = parseFloat(transferValue).toFixed(6) * (10 ** 6)
    }

    // send lastValue to bot
    if (sendback) {
      result = {
        sendback,
        data: result.value
      }
    } else {
      result = result.value
    }
    console.log('result', result)
    callResult = isFirst
      ? await callContract(contract.methods.oncommand, stateAccess, 0, tweb3.wallet.defaultAccount, result)
      : await callContract(contract.methods.ontext, stateAccess, transferValue, tweb3.wallet.defaultAccount, result)
    isFirst = false

    if (callResult) {
      if (callResult.sendback) {
        sendback = callResult.sendback
        if (sendback[tweb3.wallet.defaultAccount].state_access) {
          stateAccess = sendback[tweb3.wallet.defaultAccount].state_access
        } else {
          stateAccess = botInfo.state_access
        }
      } else {
        sendback = null
      }
      if (callResult.data) {
        callResult = callResult.data
      }
      result = await speak(callResult.messages || callResult)
    } else {
      result = undefined
    }

    if (!result || !result.value) {
      await botui.message.bot('What would you like to do?')
      result = await sayButton(commands.map(command => ({ text: command.title, value: command.value })))
      isFirst = true
      sendback = null
      stateAccess = botInfo.state_access
    }
  }
}

var getUrlParameter = function getUrlParameter (sParam) {
  var sPageURL = window.location.search.substring(1)
  var sURLVariables = sPageURL.split('&')
  var sParameterName
  var i

  for (i = 0; i < sURLVariables.length; i++) {
    sParameterName = sURLVariables[i].split('=')

    if (sParameterName[0] === sParam) {
      return sParameterName[1] === undefined ? true : decodeURIComponent(sParameterName[1])
    }
  }
}

// do not remove this semicolon
;(async () => {
  var address = getUrlParameter('address')
  if (address) {
    try {
      await connectBot(address)
    } catch (error) {
      console.log(error)
      window.alert(String(error))
    }
  } else {
    window.alert('No bot to connect!')
  }
})()
