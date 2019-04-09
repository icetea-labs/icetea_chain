import $ from 'jquery'
import * as helper from './helper'
import tweb3 from './tweb3'
import { ContractMode } from 'icetea-common'
import handlebars from 'handlebars/dist/handlebars.min.js'
import Prism from 'prismjs'
window.$ = $

function tryStringifyJson (p) {
  try {
    return JSON.stringify(p, undefined, 2)
  } catch (e) {
    return String(p)
  }
}

async function fillContracts () {
  try {
    const contracts = await tweb3.getContracts(true)

    if (!contracts.length) return

    var select = document.getElementById('to')
    contracts.forEach(item => {
      let option = document.createElement('option')
      option.value = item
      option.textContent = item
      select.appendChild(option)
    })

    fillContractInfo()
    fillFuncs()
  } catch (error) {
    console.log(error)
    window.alert(String(error))
  }
}

async function fillContractInfo () {
  try {
    var contract = document.getElementById('to').value
    if (!contract) return

    const info = await tweb3.getAccountInfo(contract)
    console.log(info)

    info.address = contract
    const isSystemContract = !!info.system
    const isRegularContract = info.hasSrc
    const isAccount = !isSystemContract && !isRegularContract
    info.type = isAccount ? 'Externally-owned account' : (isRegularContract ? 'Regular Contract' : 'System Contract')
    info.mode = info.mode || ContractMode.JS_RAW
    info.modeName = 'N/A'
    if (!isAccount) {
      if (info.mode === ContractMode.JS_RAW) {
        info.modeName = 'Raw JS'
      } else if (info.mode === ContractMode.JS_DECORATED) {
        info.modeName = 'Decorated JS'
      } else if (info.mode === ContractMode.WASM) {
        info.modeName = 'WebAssembly'
      }
    }
    info.balanceLocale = info.balance.toLocaleString()

    const source = document.getElementById('infoTemplate').innerHTML
    const template = handlebars.compile(source)
    var html = template(info)
    document.getElementById('contractInfo').innerHTML = html
  } catch (error) {
    console.log(error)
    window.alert(String(error))
  }
}

function fmtType (t, convert) {
  if (!t) return 'any'
  if (!Array.isArray(t)) {
    t = [t]
  }
  if (convert) {
    t = t.map(item => (item === 'undefined' ? 'void' : item))
  }
  return t.join('|')
}

let signatures = {}

function fillSignature () {
  var fn = document.getElementById('name').value
  if (!fn) return

  document.getElementById('funcInfo').textContent = signatures[fn]
  Prism.highlightElement(document.getElementById('funcInfo'))
}

async function fillFuncs () {
  try {
    var contract = document.getElementById('to').value
    if (!contract) return

    const funcs = await tweb3.getMetadata(contract)
    console.log(funcs)
    var select = document.getElementById('funcs')
    select.innerHTML = ''
    signatures = {}
    Object.keys(funcs).forEach(item => {
      if (item.indexOf('$') !== 0) {
        const meta = funcs[item]
        const decorators = (meta.decorators || [])
        const decos = decorators.map(d => ('@' + d))

        let option = document.createElement('option')
        option.value = item
        option.textContent = decorators.join(', ')
        select.appendChild(option)

        let signature = decos.join(' ')
        if (signature) {
          signature = signature + ' '
        }
        signature = signature + item

        if (meta.params) {
          let ps = meta.params.reduce((prev, p) => {
            prev.push(p.name + ': ' + fmtType(p.type))
            return prev
          }, []).join(', ')
          signature += '(' + ps + ')'
        }

        signature += ': ' + fmtType(meta.fieldType || meta.returnType, meta.returnType)
        signatures[item] = signature
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

  document.getElementById('to').addEventListener('change', function () {
    fillContractInfo()
    fillFuncs()
    document.getElementById('name').value = ''
    document.getElementById('funcInfo').textContent = 'No function selected.'
  })

  document.getElementById('name').addEventListener('change', function () {
    fillSignature()
  })

  $('#form').submit(async function (e) {
    e.preventDefault()
    // const privateKey = window.$('#private_key').val().trim()
    const address = window.$('#to').val().trim()
    const name = document.getElementById('name').value
    const params = helper.parseParamsFromField('#params')
    // submit tx
    try {
      var resp = tweb3.wallet.loadFromStorage('123')
      if (resp === 0) {
        window.alert('Wallet empty! Please go to Wallet tab to create account.')
        return
      }
      var ct = tweb3.contract(address)
      var tx = await ct.methods[name](...params).sendSync()
      // console.log('tx',tx);
      window.location.href = '/tx.html?hash=' + tx.hash
    } catch (error) {
      console.log(error)
      window.alert(String(error))
    }
  })

  $('#read, #pure').on('click', async function (e) {
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
    // const privateKey = window.$('#private_key').val().trim()

    // TODO: modify frontend, add from address
    try {
      const method = this.id === 'read' ? 'callReadonlyContractMethod' : 'callPureContractMethod'
      const result = await tweb3[method](address, name, params)
      // var ct = tweb3.contract(address, privateKey)
      // var result = await ct.methods[name].call(name, params)
      // if (result.success) {
        document.getElementById('resultJson').textContent = tryStringifyJson(result)
      // } else {
        // document.getElementById('resultJson').textContent = tryStringifyJson(result.error)
      // }
    } catch (error) {
      document.getElementById('resultJson').textContent = tryStringifyJson(error)
    }
    Prism.highlightElement(document.getElementById('resultJson'))
  })
})
