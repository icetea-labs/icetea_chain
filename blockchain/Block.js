const crypto = require('crypto');

module.exports = class Block {
    constructor(number, txs, prevHash, difficulty) {
        this.number = number;
        this.difficulty = difficulty;
        this.txs = txs || [];
        this.nonce = -1;
        this.prevHash = prevHash;
        this.makeNewHash();
    }

    toString() {
        return [this.txs.join(";"), this.number, this.nonce, this.prevHash, this.difficulty, this.timestamp].join(";");
    }

    makeNewHash() {
        this.timestamp = Math.floor(Date.now()/1000);
        this.nonce++;
        this.hash = crypto.createHash('sha256').update(this.toString()).digest("hex");
        //console.log(this.hash);
    }

    isHashValid() {
        return this.hash.startsWith("0".repeat(this.difficulty));
    }
}