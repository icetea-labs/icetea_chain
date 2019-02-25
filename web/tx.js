import handlebars from 'handlebars/dist/handlebars.min.js'
import { decodeTX, switchEncoding } from '../tweb3/utils'
import tweb3 from './tweb3'
import Prism from 'prismjs'

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
    const params = (data.params || []).join(', ')
    const line = `${method}(${params});`
    const comment = `// Call method '${method}' of\n// ${contract}`

    return [comment, line].join('\n')
  }

  return 'N/A' // JSON.stringify(data, null, 2);
}

async function fetchTxDetails (template, hash) {
  try {
    const tx = await tweb3.getTransaction(hash)
    console.log(tx)

    tx.status = tx.tx_result.code ? 'Error' : 'Success'

    const data = decodeTX(tx.tx)
    tx.from = data.from
    tx.to = data.to
    tx.value = data.value
    tx.fee = data.fee

    tx.txType = 'transfer'
    data.data = JSON.parse(data.data) || {}
    if (data.data.op === 0) {
      tx.txType = 'create contract'
      tx.to = tx.tx_result.data
    } else if (data.data.op === 1) {
      tx.txType = 'call contract'
    }

    tx.data = formatContractData(data.data, tx.to)
    tx.events = JSON.stringify(tweb3.utils.decodeEventData(tx), null, 2)
    tx.tags = JSON.stringify(tweb3.utils.decodeTags(tx), null, 2)

    // Do some formating

    if (tx.error === 'null') tx.error = ''
    tx.message = tx.tx_result.data

    var html = template(tx)
    document.getElementById('tableContent').innerHTML = html

    if (tx.tx_result.code) {
      document.getElementById('result').innerHTML = ansi_up.ansi_to_html(tx.tx_result.log)
    }

    Prism.highlightAll()

    return tx.status !== 'Pending'
  } catch (err) {
    console.log(err)
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
