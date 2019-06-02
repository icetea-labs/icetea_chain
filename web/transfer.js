import $ from 'jquery'
import handlebars from 'handlebars/dist/handlebars.min.js'
import { parseParamsFromField, registerTxForm, loadAddresses } from './helper'
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

$(document).ready(function () {
  loadAddresses()
  fillAddressInfo()
})

async function fillAddressInfo () {
  try {
    var contract = document.getElementById('signers').value
    if (!contract) return
    const info = await tweb3.getAccountInfo(contract)
    info.address = contract
    info.balanceLocale = toTEA(info.balance).toLocaleString()
    const source = document.getElementById('infoTemplate').innerHTML
    const template = handlebars.compile(source)
    var html = template(info)
    document.getElementById('addressInfo').innerHTML = html
  } catch (error) {
    console.log(error)
    window.alert(String(error))
  }
}
