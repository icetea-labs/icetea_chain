import $ from 'jquery'
import handlebars from 'handlebars/dist/handlebars.min.js'
import { parseParamsFromField, registerTxForm } from './helper'
import tweb3 from './tweb3'
window.$ = $

function buildData () {
  return {
    params: parseParamsFromField('#params')
  }
}
registerTxForm($('#form'), buildData)

document.getElementById('from').addEventListener('change', function () {
  fillAddressInfo()
})

$(document).ready(function () {
  fillAddressInfo()
})

async function fillAddressInfo () {
  try {
    var contract = document.getElementById('from').value
    if (!contract) return

    const info = await tweb3.getAccountInfo(contract)
    console.log(info)
    info.address = contract
    info.balanceLocale = info.balance.toLocaleString()
    const source = document.getElementById('infoTemplate').innerHTML
    const template = handlebars.compile(source)
    var html = template(info)
    document.getElementById('addressInfo').innerHTML = html
  } catch (error) {
    console.log(error)
    window.alert(String(error))
  }
}
