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
  const number = typeof req.header.height === 'number' ? req.header.height : req.header.height.toNumber()
  const timestamp = typeof req.header.time.seconds === 'number' ? req.header.time.seconds : req.header.time.seconds.toNumber()
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
    reqTx.nonce).setEvidence(reqTx.evidence)
  tx.from = reqTx.from || ecc.toAddress(reqTx.evidence.pubkey || reqTx.evidence[0].pubkey)
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
