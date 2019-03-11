const Tx = require('../Tx')
const codec = require('./codec')

function getBlock (req) {
  const hash = req.hash.toString('hex')
  const number = req.header.height.toNumber()
  const timestamp = req.header.time.seconds.toNumber()
  return { hash, number, timestamp }
}

function getTx (req) {
  let reqTx = codec.decode(req.tx)

  return new Tx(
    reqTx.from,
    reqTx.to,
    reqTx.value,
    reqTx.fee,
    JSON.parse(reqTx.data || '{}'),
    reqTx.nonce).setSignature(reqTx.signature)
}

function replyQuery (data) {
  return { code: 0, info: JSON.stringify(data) }
}

module.exports = { getBlock, getTx, replyQuery }
