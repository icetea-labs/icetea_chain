const crypto = require('crypto');

module.exports = class Block {
    constructor(txs, difficulty) {
        this.difficulty = difficulty;
        this.txs = txs || [];
        this.nonce = 0;
        this.makeNewHash();
    }

    toString() {
        return this.txs.join(";") + ";" + this.nonce;
    }

    makeNewHash() {
        this.hash = crypto.createHash('sha256').update(this.toString()).digest("hex");
        console.log(this.hash);
        this.nonce++;
    }

    isHashValid() {
        return this.hash.startsWith("0".repeat(this.difficulty));
    }
}