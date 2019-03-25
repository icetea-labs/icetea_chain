/** @module */
const { codec, ecc, Tx } = require('icetea-common')

/**
 * get block
 * @private
 * @function
 * @param {object} req - abci request
 * @returns {object} { hash, number, timestamp }
 */
function getBlock (req) {
  const hash = req.hash.toString('hex')
  const number = req.header.height
  const timestamp = req.header.time.seconds
  return { hash, number, timestamp }
}

/**
 * get transaction
 * @private
 * @function
 * @param {object} req - abci request
 * @returns {object} tx
 */
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

/**
 * reply query
 * @private
 * @function
 * @param {object} data - abci data
 * @returns {object} response object
 */
function replyQuery (data) {
  return { code: 0, info: JSON.stringify(data) }
}

module.exports = { getBlock, getTx, replyQuery }
