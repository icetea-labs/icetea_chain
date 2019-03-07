import $ from 'jquery'
import * as helper from './helper'
import utils from '../tweb3/utils'
import tweb3 from './tweb3'
window.$ = $

async function fillContracts () {
  try {
    const contracts = await tweb3.getContracts()

    if (!contracts.length) return

    var select = document.getElementById('to')
    contracts.forEach(item => {
      let option = document.createElement('option')
      option.value = item
      option.textContent = item
      select.appendChild(option)
    })

    fillFuncs()
    select.addEventListener('change', fillFuncs)
  } catch (error) {
    console.log(error)
    window.alert(String(error))
  }
}

async function fillFuncs () {
  try {
    var contract = document.getElementById('to').value
    if (!contract) return

    const funcs = await tweb3.getMetadata(contract)

    var select = document.getElementById('funcs')
    select.innerHTML = ''
    Object.keys(funcs).forEach(item => {
      if (item.indexOf('$') !== 0) {
        let option = document.createElement('option')
        option.value = item
        option.textContent = (funcs[item].decorators || []).join(', ')
        select.appendChild(option)
      }
    })
  } catch (error) {
    console.log(error)
    window.alert(String(error))
  }
}

$(document).ready(function () {
  fillContracts()
  // helper.registerTxForm($('#form'), buildData);

  $('#form').submit(async function (e) {
    e.preventDefault()
    const privateKey = window.$('#private_key').val().trim()
    const address = window.$('#to').val().trim()
    const name = document.getElementById('name').value
    const params = helper.parseParamsFromField('#params')
    // submit tx
    try {
      var ct = tweb3.contract(address, privateKey)
      var tx = await ct.methods.setValue.sendSync(name, params)
      // console.log('tx',tx);
      window.location.href = '/tx.html?hash=' + tx.hash
    } catch (error) {
      console.log(error)
      window.alert(String(error))
    }
  })

  $('#read').on('click', async function (e) {
    e.preventDefault()
    var form = document.getElementById('form')
    var address = form.to.value.trim()
    var name = form.name.value.trim()
    // if (!name) {
    //     alert("Please select a contract which has function.");
    //     return;
    // }
    document.getElementById('funcName').textContent = name
    var params = helper.parseParamsFromField('#params')
    const privateKey = window.$('#private_key').val().trim()

    // TODO: modify frontend, add from address
    try {
      // const result = await tweb3.callReadonlyContractMethod(address, name, params, { from: '617BFqg1QhNtsJiNiWz9jGpsm5iAJKqWQBhhk36KjvUFqNkh47' })
      var ct = tweb3.contract(address, privateKey)
      var result = await ct.methods.getValue.call(name, params)
      if (result.success) {
        document.getElementById('resultJson').textContent = result.data
      } else {
        document.getElementById('resultJson').textContent = utils.tryStringifyJson(result.error)
      }
    } catch (error) {
      document.getElementById('resultJson').textContent = utils.tryStringifyJson(error)
    }
  })
})
