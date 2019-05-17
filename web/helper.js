// import ecc from '../icetea/helper/ecc'
// import { ecc } from 'icetea-common'
import { utils } from 'icetea-web3'
import tweb3 from './tweb3'
import { toUNIT } from './common'

const switchEncoding = utils.switchEncoding
const replaceAll = utils.replaceAll
const tryParseJson = utils.tryParseJson

export function fieldToBase64 (selector) {
  return switchEncoding(document.querySelector(selector).value.trim(), 'utf8', 'base64')
}

export function parseParamList (pText) {
  pText = replaceAll(pText, '\r', '\n')
  pText = replaceAll(pText, '\n\n', '\n')
  let params = pText.split('\n').filter(e => e.trim()).map(tryParseJson)

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
    formData.fee = toUNIT(parseFloat(formData.unit))

    // submit tx
    try {
      // Should send sync to catch check_tx error
      var resp = tweb3.wallet.loadFromStorage('123')
      if (resp === 0) {
        window.alert('Wallet empty! Please go to Wallet tab to create account.')
        return
      }
      var result = await tweb3.sendTransactionSync(formData)
      window.location.href = '/tx.html?hash=' + result.hash
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
    var resp = tweb3.wallet.loadFromStorage('123')
    if (resp === 0) {
      window.alert('Wallet empty! Please go to Wallet tab to create account.')
      return
    }
    var wallets = tweb3.wallet.accounts
    var select = document.getElementById('signer')
    select.innerHTML = ''
    wallets.forEach(item => {
      let option = document.createElement('option')
      option.value = item.address
      option.textContent = item.address
      select.appendChild(option)
    })
  } catch (error) {
    console.log(error)
    window.alert(String(error))
  }
}
