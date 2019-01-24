const eosjs_ecc = require('eosjs-ecc')
const t = {
    verify: function(signature, message, pubKey) {
        //console.log(pubKey);
        return eosjs_ecc.verify(signature, message, "EOS" + pubKey);
    },

    verifyTx: function(tx) {
        return t.verify(tx.signature, tx.hash, tx.from);
    },

    generateKey: eosjs_ecc.randomKey,
    
    toPublicKey: function(privateKey) {
        return eosjs_ecc.privateToPublic(privateKey).slice(3);
    },

    sign: eosjs_ecc.sign
}

module.exports = t;