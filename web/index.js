import JSONFormatter from 'json-formatter-js'
import handlebars from 'handlebars/dist/handlebars.min.js'
import { utils } from 'icetea-web3'
import tweb3 from './tweb3'
import { ecc } from 'icetea-common'

const decodeTX = utils.decodeTX
const blockTemplate = handlebars.compile(document.getElementById('blockTemplate').innerHTML)
const txTemplate = handlebars.compile(document.getElementById('txTemplate').innerHTML)

function fmtTime (tm) {
  var d = (typeof tm === 'number') ? tm * 1000 : Date.parse(tm)
  return new Date(d).toLocaleTimeString()
}

function fmtHex (hex, c) {
  if (!hex || hex.length < c * 2 + 4) return hex
  if (hex.indexOf('.') >= 0) return hex
  c = c || 4
  return hex.substr(0, c) + '…' + hex.substr(-c)
}

function fmtBlocks (blocks) {
  return blocks.map(b => ({
    height: b.header.height,
    shash: fmtHex(b.block_id.hash, 10),
    timestamp: fmtTime(b.header.time),
    txCount: b.header.num_txs
  }))
}

function fmtTxs (txs) {
  Object.keys(txs).forEach(k => {
    const t = txs[k]
    t.shash = fmtHex(t.hash)
    t.blockHeight = t.height

    const data = decodeTX(t.tx)
    let from = data.from
    if (!from) {
      const pubkey = data.evidence.pubkey || data.evidence[0].pubkey
      from = ecc.toAddress(pubkey)
    }
    t.from = fmtHex(from, 6)
    t.to = fmtHex(data.to, 6)
    t.value = data.value
    t.fee = data.fee

    t.status = t.tx_result.code ? 'Error' : 'Success'

    t.txType = 'transfer'
    data.data = JSON.parse(data.data) || {}
    if (data.data.op === 0) {
      t.txType = 'deploy'
      // t.to = fmtHex(t.tx_result.data);
    } else if (data.data.op === 1) {
      t.txType = 'call'
    }
  })
  return txs.reverse()
}

function showMessage () {
  // parse message to show
  var parts = window.location.href.split('?')
  if (parts.length > 1) {
    document.getElementById('info').textContent = decodeURIComponent(parts[1])
    setTimeout(() => {
      document.getElementById('info').textContent = ''
    }, 4000)
  }
  // tweb3.subscribe('NewBlock',{}, message => {
  //   console.log("message: ", JSON.parse(message));
  // });
}

let blockCount = 0
async function loadData () {
  // load block info
  const blockchain = await tweb3.getBlocks()
  var myBlocks = blockchain.block_metas
  if (myBlocks && myBlocks.length && myBlocks.length > blockCount) {
    blockCount = myBlocks.length

    document.getElementById('blocks').innerHTML = blockTemplate(fmtBlocks(myBlocks))

    // load txs info
    const MAX_SHOW_TX = 30 // only show last 30 txs
    let txCount = 0
    let fromBlock = myBlocks[0].header.height
    for (let i = 0; i < blockCount; i++) {
      const num = +myBlocks[i].header.num_txs
      txCount += num
      fromBlock--
      if (txCount > MAX_SHOW_TX) {
        break
      }
    }

    const myTxs = await tweb3.searchTransactions('tx.height>' + fromBlock, { per_page: txCount })
    if (myTxs.txs && myTxs.txs.length) {
      // console.log(myTxs)
      document.getElementById('transactions').innerHTML = txTemplate(fmtTxs(myTxs.txs))
    }

    // load debug info
    const myJSON = await tweb3.getDebugState()

    const formatter = new JSONFormatter(myJSON, 1)
    document.getElementById('debug').innerHTML = ''
    document.getElementById('debug').appendChild(formatter.render())
  }
}

(() => {
  showMessage()
  loadData()
  setInterval(loadData, 3500)
})()
