import handlebars from 'handlebars/dist/handlebars.min.js'
import tweb3 from './tweb3'
import { toTEA } from './common'
import { fmtHex, fmtTime } from './helper'

const getBlockInfo = async height => {
  const info = await tweb3.getBlocks({
    minHeight: height,
    maxHeight: height
  })

  const lastHeight = info.last_height
  const block = info.block_metas[0]

  const data = block.header
  data.lastHeight = lastHeight
  data.hash = block.block_id.hash
  data.prevHash = data.last_block_id.hash
  data.prevHeight = (data.height - 1) || 1
  data.time = fmtTime(data.time)

  const source = document.getElementById('tableTemplate').innerHTML
  const template = handlebars.compile(source)
  const html = template(data)
  document.getElementById('tableContent').innerHTML = html

  return data.num_txs
}

const getTxByBlock = async height => {
  try {
    const data = await tweb3.searchTransactions('tx.height=' + height, { per_page: 100 })
    const all = data.txs.map(tweb3.utils.decodeTxResult)
    console.log(all)
    if (all.length) {
      all.forEach(x => {
        x.from = x.tx.from || x.tags['tx.from']
        x.fromText = fmtHex(x.from)
        x.to = x.tx.to || x.tags['tx.to']
        x.toText = fmtHex(x.to)
        x.payer = x.tx.payer || x.tags['tx.payer']
        x.payerText = fmtHex(x.payer)
        x.tx.data = x.tx.data || {}

        x.status = x.tx_result.code ? 'Error' : 'Success'
        x.shash = fmtHex(x.hash)
        x.blockHeight = +x.height
        x.value = (x.tx.value || 0)
        x.valueText = toTEA(x.value).toLocaleString() + ' TEA'

        x.txType = 'transfer'
        const op = x.tx.data.op
        if (op === 0) {
          x.txType = 'deploy'
        } else if (op === 1) {
          x.txType = 'call'
        }
      })

      const sorted = all.sort((a, b) => {
        const delta = b.blockHeight - a.blockHeight
        if (delta) return delta
        return b.index - a.index
      })
      const source = document.getElementById('txTemplate').innerHTML
      const template = handlebars.compile(source)
      const html = template(sorted)
      document.getElementById('transactions').innerHTML = html
    }
  } catch (err) {
    console.log(err, err.error)
  }
}

(async () => {
  const height = new URLSearchParams(window.location.search).get('height')
  if (height) {
    const numTxs = await getBlockInfo(+height)
    if (numTxs) {
      getTxByBlock(+height)
    }
  }
})()
