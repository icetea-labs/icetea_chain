import $ from 'jquery'
import * as helper from './helper'
import tweb3 from './tweb3'
import { ContractMode } from 'icetea-common'
import handlebars from 'handlebars/dist/handlebars.min.js'
import Prism from 'prismjs'
import { toUNIT, toTEA } from './common'
window.$ = $

const tryStringifyJson = helper.tryStringifyJson

async function fillContracts () {
  try {
    const contracts = await tweb3.getContracts(true)

    if (!contracts.length) return

    const address = (new URL(document.location)).searchParams.get('address')
    var select = document.getElementById('to')
    contracts.forEach(item => {
      const option = document.createElement('option')
      option.value = item
      if (item === address) {
        option.selected = true
      }
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
    info.balanceLocale = toTEA(info.balance).toString()

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
    if (!contract) {
      $('#lookLikeBot').hide()
      return
    }

    const funcs = await tweb3.getMetadata(contract)

    const lookLikeBot = funcs.botInfo ||
      (funcs.getName && funcs.getDescription)
    if (lookLikeBot) {
      $('#lookLikeBot').show()
    } else {
      $('#lookLikeBot').hide()
    }

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
  const contractBox = document.getElementById('to')
  contractBox.addEventListener('change', function () {
    fillContractInfo()
    fillFuncs()
    document.getElementById('name').value = ''
    document.getElementById('funcInfo').textContent = 'No function selected.'
  })

  helper.loadAddresses()

  document.getElementById('name').addEventListener('change', function () {
    fillSignature()
  })

  $('#form').submit(async function (e) {
    e.preventDefault()

    const address = window.$('#to').val()
    const name = document.getElementById('name').value
    const params = helper.parseParamsFromField('#params')

    const value = document.getElementById('value').value
    const fee = document.getElementById('fee').value

    // submit tx
    try {
      var resp = tweb3.wallet.loadFromStorage('123')
      if (resp === 0) {
        window.alert('Wallet empty! Please go to Wallet tab to create account.')
        return
      }
      var ct = tweb3.contract(address)
      var tx = await ct.methods[name](...params).sendSync({
        value: toUNIT(parseFloat(value)),
        fee: toUNIT(parseFloat(fee))
      })
      // console.log('tx',tx);
      window.location.href = '/tx.html?hash=' + tx.hash
    } catch (error) {
      console.log(error)
      window.alert(String(error))
    }
  })

  function popupwindow (url, title, w, h) {
    var left = (window.screen.width / 2) - (w / 2)
    var top = (window.screen.height / 2) - (h / 2)
    return window.open(url, title, 'toolbar=no, location=no, directories=no, status=no, menubar=no, scrollbars=no, resizable=no, copyhistory=no, width=' + w + ', height=' + h + ', top=' + top + ', left=' + left)
  }

  $('#lookLikeBot').on('click', function (e) {
    e.preventDefault()

    const url = '/botpoup.html' + '?address=' + $('#to').val()
    popupwindow(url, 'title', 800, 600)
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
