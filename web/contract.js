import $ from 'jquery'
import * as helper from './helper'
import utils from '../tweb3/utils'
import tweb3 from './tweb3'
window.$ = $

function buildData() {
  return {
    op: 1,
    name: document.getElementById('name').value,
    params: helper.parseParamsFromField('#params')
  }
}

async function fillContracts() {
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
    alert(String(error))
  }
}

async function fillFuncs() {
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
    alert(String(error))
  }
}

$(document).ready(function () {
  fillContracts()
  helper.registerTxForm($('#form'), buildData)

  $('#read').on('click', async function (e) {
    var form = document.getElementById('form')
    var address = form.to.value.trim()
    var name = form.name.value.trim()
    // if (!name) {
    //     alert("Please select a contract which has function.");
    //     return;
    // }
    document.getElementById('funcName').textContent = name

    var params = helper.parseParamsFromField('#params')

    // TODO: modify frontend, add from address
    try {
      const result = await tweb3.callReadonlyContractMethod(address, name, params, { from: '617BFqg1QhNtsJiNiWz9jGpsm5iAJKqWQBhhk36KjvUFqNkh47' })
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
