import handlebars from 'handlebars/dist/handlebars.min.js'
import { utils } from 'icetea-web3'
import tweb3 from './tweb3'
import Prism from 'prismjs'
import { tryStringifyJson } from './helper'

const switchEncoding = utils.switchEncoding
const tryParseJson = utils.tryParseJson

var AU = require('ansi_up')
var ansi_up = new AU.default() // eslint-disable-line

function formatContractData (data, contract) {
  if (data.op === 0) {
    const modes = ['JS Raw', 'JS Decorated', 'WASM']
    const comment = `// Deploy ${contract}\n// Params: ${(data.params || []).join(', ') || 'none'}
// Source mode: '${modes[data.mode]}'\n// Source code:\n`
    const source = (data.mode === 100) ? '/* WASM Binary */'
      : switchEncoding(data.src, 'base64', 'utf8')
    return comment + source
  } else if (data.op === 1) {
    const method = data.name
    const params = (data.params || []).map(p => {
      let pp = tryParseJson(p)
      if (typeof pp === 'string') {
        pp = `"${pp}"`
      }
      return JSON.stringify(pp)
    }).join(', ')
    const line = `${method}(${params});`
    const comment = `// Call method '${method}' of\n// ${contract}`

    return [comment, line].join('\n')
  }

  return 'N/A' // JSON.stringify(data, null, 2);
}

async function fetchTxDetails (template, hash) {
  try {
    const tx = await tweb3.getTransaction(hash)

    tx.status = tx.tx_result.code ? 'Error' : 'Success'

    const data = tx.tx // decodeTX(tx.tx)
    tx.to = data.to
    tx.value = data.value
    tx.fee = data.fee
    if (typeof tx.result === 'object') {
      document.getElementById('result').classList.add('language-js')
    }
    tx.result = tryStringifyJson(tx.result, undefined, 2)

    tx.txType = 'transfer'
    data.data = JSON.parse(data.data) || {}
    if (data.data.op === 0) {
      tx.txType = 'deploy'
      tx.to = tx.result
      if (tx.to) {
        tx.metadata = tryStringifyJson(await tweb3.getMetadata(tx.to), null, 2)
      }
    } else if (data.data.op === 1) {
      tx.txType = 'call'
    }

    tx.data = formatContractData(data.data, tx.to)
    tx.events = tryStringifyJson(tx.events, null, 2) // tweb3.utils.decodeEventData(tx), null, 2)
    // const tags = tweb3.utils.decodeTags(tx)
    tx.from = tx.tags['tx.from']
    tx.tags = tryStringifyJson(tx.tags, null, 2)

    // Do some formating

    if (tx.error === 'null') tx.error = ''

    var html = template(tx)
    document.getElementById('tableContent').innerHTML = html

    if (tx.tx_result.code) {
      document.getElementById('result').innerHTML = ansi_up.ansi_to_html(tx.tx_result.log)
    }

    if (data.data.op === 0 && tx.to) {
      document.getElementById('resultTd').textContent = 'Address'
      const btn = document.getElementById('call')
      btn.classList.remove('hide')
      btn.addEventListener('click', function (e) {
        e.preventDefault()
        window.location.href = '/contract.html?address=' + tx.to
      })
    }

    Prism.highlightAll()

    return tx.status !== 'Pending'
  } catch (err) {
    console.log(err, err.info)
    return false
  }
}

(async () => {
  const hash = new URLSearchParams(window.location.search).get('hash')
  if (hash) {
    const source = document.getElementById('tableTemplate').innerHTML
    const template = handlebars.compile(source)

    if (!(await fetchTxDetails(template, hash))) {
      var interval = setInterval(async () => {
        if (await fetchTxDetails(template, hash)) clearInterval(interval)
      }, 1000)
    }
  }
})()
