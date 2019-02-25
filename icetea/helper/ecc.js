const ecc = require('eosjs-ecc')
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

  sign: ecc.sign
}

module.exports = t
