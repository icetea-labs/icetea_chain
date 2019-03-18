const { codec, ecc, Tx } = require('icetea-common')

function getBlock (req) {
  const hash = req.hash.toString('hex')
  const number = req.header.height
  const timestamp = req.header.time.seconds
  return { hash, number, timestamp }
}

function getTx (req) {
  let reqTx = codec.decode(req.tx)
  const tx = new Tx(
    reqTx.to,
    reqTx.value,
    reqTx.fee,
    JSON.parse(reqTx.data || '{}'),
    reqTx.nonce).setSignature(reqTx.signature)
  tx.publicKey = reqTx.publicKey
  tx.from = ecc.toAddress(reqTx.publicKey)
  return tx
}

function replyQuery (data) {
  return { code: 0, info: JSON.stringify(data) }
}

module.exports = { getBlock, getTx, replyQuery }
