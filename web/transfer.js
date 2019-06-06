import $ from 'jquery'
import handlebars from 'handlebars/dist/handlebars.min.js'
import { parseParamsFromField, registerTxForm, loadAddresses, registerMoreButtons } from './helper'
import tweb3 from './tweb3'
import { toTEA } from './common'
window.$ = $

function buildData () {
  return {
    params: parseParamsFromField('#params')
  }
}
registerTxForm($('#form'), buildData)

document.getElementById('signers').addEventListener('change', function () {
  fillAddressInfo()
})

$(document).ready(async function () {
  registerMoreButtons()
  await loadAddresses()
  fillAddressInfo()
})

async function fillAddressInfo () {
  try {
    var signer = document.getElementById('signers').value
    if (!signer) return
    const info = await tweb3.getAccountInfo(signer)
    info.address = signer
    info.balanceLocale = toTEA(info.balance).toLocaleString()
    const t = info.address[4]
    if (t === '0') {
      info.type = 'Regular Account'
    } else if (t === '1') {
      info.type = 'Bank Account'
    } else {
      info.type = 'Invalid account type'
    }
    const source = document.getElementById('infoTemplate').innerHTML
    const template = handlebars.compile(source)
    var html = template(info)
    document.getElementById('addressInfo').innerHTML = html
  } catch (error) {
    console.log(error)
    window.alert(String(error))
  }
}
