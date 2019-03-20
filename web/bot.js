import Vue from 'vue'
import BotUI from 'botui'
import tweb3 from './tweb3'

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
      case 'button': {
        return sayButton(item.content)
      }
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

async function callContract (method, type = 'view', ...params) {
  const map = {
    'pure': 'callPure',
    'view': 'call',
    'transaction': 'sendCommit'
  }

  const result = await method[map[type]](params)

  if (type === 'transaction') {
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
  const botAddr = byId('bot_address').value.trim()
  const privKey = byId('private_key').value.trim()
  const contract = tweb3.contract(botAddr, privKey)

  // get bot info
  const resInfo = await contract.methods.info.callPure()
  if (!resInfo.success) {
    return window.alert(json(resInfo.error))
  }
  const botInfo = resInfo.data
  botInfo.ontext_type = botInfo.ontext_type || 'view'

  botui.message.removeAll()

  // display bot info
  await say(`<b>${botInfo.name}</b><br>${botInfo.description}`, { type: 'html', cssClass: 'bot-intro' })

  // display Start button
  let result = await sayButton({ text: botInfo.startText || 'Start', value: 'start' })

  while (result) {
    // send lastValue to bot
    const callResult = await callContract(contract.methods.ontext, botInfo.ontext_type, result.value)

    // if bot has error, say so and stop things
    if (!callResult.success) {
      return window.alert(json(callResult.error))
    }

    result = await speak(callResult.data)
  }
}, false)
