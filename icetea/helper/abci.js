/** @module */
const { codec, Tx } = require('icetea-common')
const { serialize } = require('./utils')

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
  tx.from = reqTx.from

  // TODO: should move this change to icetea-common
  tx.value = BigInt(tx.value)
  tx.fee = BigInt(tx.fee)

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
  return { code: 0, info: serialize(data) }
}

module.exports = { getBlock, getTx, replyQuery }
