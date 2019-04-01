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
  getListAddress()
  fillAddressInfo()
})
async function getListAddress () {
  try {
    var resp = tweb3.wallet.loadFromStorage('123')
    if (resp === 0) {
      window.alert('Wallet empty! Please go to Wallet tab to create account.')
      return
    }
    var wallets = tweb3.wallet.accounts
    $('#currentDefaultAcc').text(tweb3.wallet.defaultAccount)
    var select = document.getElementById('from')
    $('#from').empty()
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
