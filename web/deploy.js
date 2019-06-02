import $ from 'jquery'
import { transpile, setWhiteListModules } from 'sunseed'
import * as helper from './helper'
import tweb3 from './tweb3'
import { toUNIT } from './common'
import { whitelistModules } from '../icetea/config'
window.$ = $

var wasmBuffer = null
setWhiteListModules(whitelistModules)

// helper.registerTxForm($('#form'), buildData);
$('#form').submit(async function (e) {
  e.preventDefault()
  var mode = +document.getElementById('srcMode').value
  // const privateKey = window.$('#private_key').val().trim()
  var src
  if (mode === 100) {
    src = wasmBuffer
    if (!src) {
      window.alert('You must upload a wasm file.')
      return null
    }
  } else {
    src = document.querySelector('#src').value.trim()
    if (!src) {
      window.alert('You must provide contract source.')
      return null
    }
    if (mode === 1 && src.indexOf('@contract') < 0) {
      window.alert("There is no @contract decorator. You should select 'Raw JS' contract source mode.")
      return null
    }
  }

  try {
    const signers = document.getElementById('signers').value
    const from = document.getElementById('from').value
    const payer = document.getElementById('payer').value
    const value = document.getElementById('value').value
    const fee = document.getElementById('fee').value

    var params = helper.parseParamsFromField('#params')
    var resp = tweb3.wallet.loadFromStorage('123', tweb3.wallet, signers || tweb3.wallet.defaultAccount)
    if (resp === 0) {
      window.alert('Wallet empty! Please go to Wallet tab to create account.')
      return
    }

    // only raw js
    if (mode === 1) {
      mode = 0
      src = await transpile(src, { prettier: true })
    }
    const tx = await tweb3.deploy(mode, src, params, {
      signers,
      from,
      payer,
      value: toUNIT(parseFloat(value)),
      fee: parseInt(fee)
    })
    // console.log('tx',tx);
    window.location.href = '/tx.html?hash=' + tx.hash
  } catch (error) {
    console.log(error)
    window.alert(String(error))
  }
})

document.getElementById('srcMode').addEventListener('change', function (e) {
  var s = this.value
  document.querySelectorAll('[data-modes]').forEach(function (item) {
    item.classList.remove('hide')
    var modes = item.getAttribute('data-modes').split(';')
    if (modes.indexOf(s) < 0) {
      item.classList.add('hide')
    }
  })
})

document.getElementById('wasmFile').addEventListener('change', function (e) {
  if (!this.files || !this.files.length) return
  var file = this.files[0]
  var reader = new window.FileReader()
  reader.readAsDataURL(file)
  reader.onload = function () {
    wasmBuffer = reader.result.split(',')[1]
  }
  reader.onerror = function (error) {
    console.log(error)
    window.alert(String(error))
  }
})

helper.loadAddresses()
