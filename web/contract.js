import $ from 'jquery'
import * as helper from './helper'
import tweb3 from './tweb3'
import { ContractMode } from '@iceteachain/common'
import handlebars from 'handlebars/dist/handlebars.min.js'
import Prism from 'prismjs'
import { toUNIT, toTEA } from './common'
window.$ = $

const tryStringifyJson = function (value) {
  return helper.tryStringifyJson(value, undefined, 2)
}

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
        info.modeName = 'Regular JS'
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

function setVisible (selector, signature, stateAccess, stateAccess2) {
  var $item = $(selector)
  if (!signature || signature.indexOf('@') < 0 ||
    signature.indexOf(stateAccess) >= 0 ||
    (stateAccess2 && signature.indexOf(stateAccess2) >= 0)) {
    $item.show()
  } else {
    $item.hide()
  }
}

function fillSignature () {
  var fn = document.getElementById('name').value
  if (!fn) return

  if (signatures[fn]) {
    document.getElementById('funcInfo').innerHTML = signatures[fn]
    Prism.highlightElement(document.getElementById('funcInfo'))
  }
  setVisible('#submit_btn', signatures[fn], '@transaction', '@payable')
  setVisible('#read', signatures[fn], '@view')
  setVisible('#pure', signatures[fn], '@pure')
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

        const option = document.createElement('option')
        option.value = item
        option.textContent = decorators.join(', ')
        select.appendChild(option)

        let signature = decos.join(' ')
        if (signature) {
          signature = signature + ' '
        }
        signature = signature + item

        if (meta.params) {
          const ps = meta.params.reduce((prev, p) => {
            prev.push(p.name + ': ' + fmtType(p.type))
            return prev
          }, []).join(', ')
          signature += '(' + ps + ')'
        }

        signature += ': ' + fmtType(meta.fieldType || meta.returnType, meta.returnType)
        signatures[item] = signature
      }
    })

    const fn = (new URL(document.location)).searchParams.get('fn')
    if (fn) {
      document.getElementById('name').value = fn
      fillSignature()
      document.getElementById('params').focus()
    }
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
    document.getElementById('funcInfo').innerHTML = 'No function selected.'
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

    const signers = document.getElementById('signers').value
    const from = document.getElementById('from').value
    const payer = document.getElementById('payer').value

    var result

    // submit tx
    try {
      document.getElementById('funcName').innerHTML = name

      var resp = await tweb3.wallet.loadFromStorage('123', tweb3.wallet, signers || tweb3.wallet.defaultAccount)
      if (resp === 0) {
        window.alert('Wallet empty! Please go to Wallet tab to create account.')
        return
      }
      document.getElementById('resultJson').innerHTML = "<span class='Error'>sending...</span>"
      var ct = tweb3.contract(address)
      result = await ct.methods[name](...params).sendCommit({
        signers,
        from,
        payer,
        value: toUNIT(parseFloat(value)),
        fee: parseInt(fee)
      })
      console.log(result)
      // console.log(tryStringifyJson(result));
      document.getElementById('resultJson').innerHTML = formatResult(result)
    } catch (error) {
      console.log(error)
      document.getElementById('resultJson').innerHTML = formatResult(error, true)
    }

    window.scrollTo(0, document.body.scrollHeight)
  })

  function formatResult (r, isError) {
    const fail = isError || r.deliver_tx.code || r.check_tx.code
    let msg
    if (fail) {
      msg = '<b>Result</b>: <span class="Error":>ERROR</span><br><b>Message</b>: <span class="Error">' +
        (r.deliver_tx.log || r.check_tx.log || tryStringifyJson(r)) + '</span>' + '<br><b>Hash</b>: '
      if (r.hash) {
        msg += '<a href="/tx.html?hash=' + r.hash + '">' + r.hash + '</a>'
      } else {
        msg += 'N/A'
      }
      return msg
    } else {
      msg = '<b>Result</b>: <span class="Success"><b>SUCCESS</b></span>' +
        '<br><b>Returned Value</b>:  <span class="Success">' + tryStringifyJson(r.returnValue) + '</span>' +
        '<br><b>Hash</b>: <a href="/tx.html?hash=' + r.hash + '">' + r.hash + '</a>'
      msg += '<br><b>Height</b>: ' + r.height + '<br><b>Events:</b> ' + tryStringifyJson(r.events)
      return msg
    }
  }

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
    document.getElementById('funcName').innerHTML = name
    document.getElementById('resultJson').innerHTML = "<span class='Error'>calling...</span>"
    var params = helper.parseParamsFromField('#params')
    // const privateKey = window.$('#private_key').val().trim()

    // TODO: modify frontend, add from address
    try {
      const method = this.id === 'read' ? 'callReadonlyContractMethod' : 'callPureContractMethod'
      const result = await tweb3[method](address, name, params)
      // var ct = tweb3.contract(address, privateKey)
      // var result = await ct.methods[name].call(name, params)
      // if (result.success) {
      document.getElementById('resultJson').innerHTML = tryStringifyJson(result)
      // } else {
      // document.getElementById('resultJson').innerHTML = tryStringifyJson(result.error)
      // }
    } catch (error) {
      document.getElementById('resultJson').innerHTML = tryStringifyJson(error)
    }
    // Prism.highlightElement(document.getElementById('resultJson'))
  })

  helper.registerMoreButtons()
})
