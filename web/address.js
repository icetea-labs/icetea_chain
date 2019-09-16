import handlebars from 'handlebars/dist/handlebars.min.js'
import tweb3 from './tweb3'
import { toTEA } from './common'
import { fmtHex } from './helper'

const getAccountInfo = async address => {
  const info = await tweb3.getAccountInfo(address)
  info.address = address
  info.balanceText = toTEA(info.balance).toLocaleString() + ' TEA'
  info.isContract = info.hasSrc || info.system
  info.isContractText = info.isContract ? 'YES' : 'NO'
  info.category = tweb3.utils.isRegularAccount(address) ? 'Regular Account' : 'Bank Account'

  info.modeText = info.mode ? 'Wasm' : 'JavaScript'

  const source = document.getElementById('tableTemplate').innerHTML
  const template = handlebars.compile(source)
  const html = template(info)
  document.getElementById('tableContent').innerHTML = html
}

const getTxHistory = async address => {
  try {
    const fromList = await tweb3.searchTransactions("tx.from='" + address + "'", { per_page: 100 })
    const toList = await tweb3.searchTransactions("tx.to='" + address + "'", { per_page: 100 })
    const payerList = await tweb3.searchTransactions("tx.payer='" + address + "'", { per_page: 100 })
    const all = fromList.txs.concat(toList.txs).concat(payerList.txs).map(tweb3.utils.decodeTxResult)

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
  const address = new URLSearchParams(window.location.search).get('address')
  if (address) {
    getAccountInfo(address)
    getTxHistory(address)
  }
})()
