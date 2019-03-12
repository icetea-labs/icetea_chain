const ecc = require('eosjs-ecc')
const Tx = require('./Tx')

const t = {
  verify: function (signature, message, pubKey) {
    if (!signature) throw new Error('Signature is required')
    if (!message) throw new Error('Message is required to verify signature')
    return ecc.verify(signature, message, 'EOS' + pubKey)
  },

  verifyTxSignature: function (tx) {
    if (!t.verify(tx.signature, tx.signatureMessage, tx.from)) {
      throw new Error('Invalid signature')
    }
  },

  generateKey: ecc.randomKey,

  toPublicKey: function (privateKey) {
    return ecc.privateToPublic(privateKey).slice(3)
  },

  sign: ecc.sign,

  signTxData (txData, privateKey) {
    const tx = new Tx(txData.from, txData.to, txData.value, txData.fee, txData.data, txData.nonce)
    txData.signature = ecc.sign(tx.signatureMessage, privateKey)
    if (!txData.nonce) {
      txData.nonce = tx.nonce
    }
    if (typeof txData.data !== 'string') {
      txData.data = JSON.stringify(txData.data)
    }

    return txData
  }
}

module.exports = t
