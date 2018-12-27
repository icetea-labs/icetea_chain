const params = require("./Params");
const Block = require('./Block');

module.exports = class Miner {

    constructor (chain, txPool) {
        this.chain = chain;
        this.txPool = txPool || [];
    }

    makeBlock () {

        if (this.txPool.length === 0) {
            // no pending transaction, just ignore
            return null;
        }

        const BLOCK_SIZE = 2;
        const newBlock = new Block();

        newBlock.txs = newBlock.txs.concat(this.txPool.slice(0, BLOCK_SIZE));

        return newBlock;
    }

    startMine() {
        setInterval(() => {

            // Choose txs from txPool
            if (this.txPool.length === 0) return;
            let txs = this.txPool.slice(0, params.BLOCK_SIZE)

            // Create new block
            let block = new Block(txs, params.DIFFICULTY);

            while (!block.isHashValid()) {
                block.makeNewHash();
            }

            // Insert new valid block to blockchain
            this.chain.addBlock(block);

            // remove mined txs from pool
            this.txPool.splice(0, block.txs.length);

            console.log("MINED~~ YEAH", block);

            // Broadcast to neighbor nodes
            // TODO: later

        }, 1000);
    }
}