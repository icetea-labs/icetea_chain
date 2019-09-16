import tweb3 from './tweb3'
import { toUNIT } from './common'

export function replaceAll (text, search, replacement) {
  return text.split(search).join(replacement)
}

export function tryParseJson (p) {
  try {
    return JSON.parse(p)
  } catch (e) {
    // console.log("WARN: ", e);
    return p
  }
}

export function ensureBuffer (buf, enc) {
  return Buffer.isBuffer(buf) ? buf : Buffer.from(buf, enc)
}

export function switchEncoding (str, from, to) {
  return ensureBuffer(str, from).toString(to)
}

export function fieldToBase64 (selector) {
  return switchEncoding(document.querySelector(selector).value.trim(), 'utf8', 'base64')
}

export function parseParamList (pText) {
  pText = replaceAll(pText, '\r', '\n')
  pText = replaceAll(pText, '\n\n', '\n')
  const params = pText.split('\n').filter(e => e.trim()).map(tryParseJson)

  return params
}

export function parseParamsFromField (selector) {
  return parseParamList(document.querySelector(selector).value.trim())
}

export function registerTxForm ($form, txData) {
  $form.submit(async function (e) {
    e.preventDefault()

    if (typeof txData === 'function') {
      txData = txData()
      if (!txData) return
    }
    txData = txData || {}

    var formData = $form.serializeArray().reduce(function (obj, item) {
      obj[item.name] = item.value
      return obj
    }, {})

    // console.log(txData)
    formData.data = txData

    // value and fee in unit
    formData.value = toUNIT(parseFloat(formData.value))
    formData.fee = parseInt(formData.fee)

    const signers = formData.signers
    delete formData.signers

    // submit tx
    try {
      // Should send sync to catch check_tx error
      var resp = await tweb3.wallet.loadFromStorage('123', tweb3.wallet, signers || tweb3.wallet.defaultAccount)

      if (resp === 0) {
        window.alert('Wallet empty! Please go to Wallet tab to create account.')
        return
      }
      var result = await tweb3.sendTransactionSync(formData, { signers })
      if ($form.attr('data-stay')) {
        window.alert(exports.tryStringifyJson(result))
      } else {
        window.location.href = '/tx.html?hash=' + result.hash
      }
    } catch (error) {
      console.log(error)
      window.alert(String(error))
    }
  })
}

export function detectCallType (decorators) {
  if (!decorators) {
    return 'unknown'
  }
  if (decorators.includes('payable')) {
    return 'transaction'
  } else if (decorators.includes('transaction')) {
    return 'transaction'
  } else if (decorators.includes('pure')) {
    return 'pure'
  }

  return 'view'
}

export function tryStringifyJson (p, replacer, space) {
  if (typeof p === 'string') {
    return p
  }
  try {
    return JSON.stringify(p, replacer, space)
  } catch (e) {
    return String(p)
  }
}

export async function loadAddresses () {
  try {
    var count = await tweb3.wallet.loadFromStorage('x', undefined, [])
    console.log(count, tweb3.wallet.accounts)
    if (!count) {
      window.alert('Wallet empty. Please go to Wallet tab to create account.')
      return
    }

    var wallet = tweb3.wallet

    var select = document.getElementById('signers')
    select.innerHTML = ''
    wallet.accounts.forEach(item => {
      const option = document.createElement('option')
      option.value = item.address
      option.textContent = item.address
      select.appendChild(option)
    })
    if (wallet.defaultAccount) {
      select.value = wallet.defaultAccount
    }

    if (wallet.accounts.length !== 1) {
      window.$('.hide-when-1-account').show().remove('more-opts')
    }
  } catch (error) {
    console.log(error)
    window.alert(String(error))
  }
}

export function registerMoreButtons () {
  var $ = window.$
  $('.more').on('click', function (e) {
    e.preventDefault()
    $($(this).attr('data-target')).fadeToggle('fast')
  })
}

export function fmtHex (hex, c) {
  if (!hex || hex.length < c * 2 + 4) return hex
  if (hex.indexOf('.') >= 0) return hex
  c = c || 4
  return hex.substr(0, c - 1) + '...' + hex.substr(-c - 1)
}

export function fmtTime (tm) {
  var d = (typeof tm === 'number') ? tm * 1000 : Date.parse(tm)
  return new Date(d).toLocaleString()
}

export function loadFromStorage () {
  return tweb3.wallet.loadFromStorage('123')
}
