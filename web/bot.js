import Vue from 'vue'
import BotUI from 'botui'
import tweb3 from './tweb3'

const initWeb3 = (showAlert = true) => {
  try {
    var resp = tweb3.wallet.loadFromStorage('123')
    if (resp === 0) {
      window.alert('Wallet empty! Please go to tap wallet create account')
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

function byId (id) {
  return document.getElementById(id)
}

function json (o) {
  try {
    return JSON.stringify(o)
  } catch (e) {
    return String(o)
  }
}

async function callContract (method, type = 'read', ...params) {
  const map = {
    'none': 'callPure',
    'read': 'call',
    'write': 'sendCommit'
  }

  const result = await method(...params)[map[type]]()

  if (type === 'write') {
    if (result.check_tx.code || result.deliver_tx.code) {
      return {
        success: false,
        error: result.check_tx.log || result.deliver_tx.log
      }
    } else {
      return {
        success: true,
        data: result.deliver_tx.data
      }
    }
  } else {
    return result
  }
}

document.getElementById('connect').addEventListener('click', async function () {
  if (!web3Inited) {
    web3Inited = initWeb3()
  }
  if (!web3Inited) return

  const botAddr = byId('bot_address').value.trim()
  const contract = tweb3.contract(botAddr)

  // get bot info
  const resInfo = await contract.methods.botInfo().callPure()
  if (!resInfo.success) {
    console.error(resInfo)
    return window.alert(json(resInfo.error))
  }
  const botInfo = resInfo.data
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

  // display Start button
  let result = await sayButton({ text: botInfo.start_button || 'Start', value: 'start' })
  let isFirst = true
  while (result && result.value) {
    // send lastValue to bot
    const callResult = isFirst
      ? await callContract(contract.methods.onstart, botInfo.state_access)
      : await callContract(contract.methods.ontext, botInfo.state_access, result.value)
    isFirst = false

    // if bot has error, say so and stop things
    if (!callResult.success) {
      console.error(callResult)
      return window.alert(json(callResult.error))
    }

    result = await speak(callResult.data)
  }
}, false)
