const params = require("./Params");
const Block = require('./Block');

module.exports = class Miner {

    constructor (chain, txPool) {
        this.chain = chain;
        this.txPool = txPool || [];
        this.stateTable = {
            miner: {
                balance: 0,
            }
        }
    }

    execTx(tx) {
        const t = this.stateTable;
        t[tx.from] = t[tx.from] || {balance: 0};
        t[tx.from].balance -= parseFloat(tx.value || 0) + parseFloat(tx.fee || 0);

        t[tx.to] = t[tx.to] || {balance: 0};
        t[tx.to].balance += parseFloat(tx.value || 0);

        t.miner.balance += parseFloat(tx.fee || 0);

        //console.log(tx);

        if (!tx.extra || typeof tx.extra.op === "undefined") return;

        if (tx.extra.op == 0) {
            // make a address for smart contract
            let scAddr = tx.from + "_" + Date.now();
            this.stateTable[scAddr] = {
                balance: 0,
                src: Buffer.from(tx.extra.src, 'base64').toString("ascii")
            }

            return;
        }

        if (tx.extra.op == 1) {
            let scAddr = tx.extra.contract.address;
            const t = this.stateTable;
            if (!t[scAddr] || !t[scAddr].src) {
                console.log("clgt");
            } else {
                const f = new Function("arg", "tx", t[scAddr].src);
                f(tx.extra.contract.function, tx);
            }
        }
    }

    execBlock(block) {
        block.txs.forEach(tx => {
            this.execTx(tx);
        });

        this.stateTable.miner.balance += params.MINER_REWARD;
    }

    balanceOf(who) {
        const state = this.stateTable[who];
        if (!state) return 0;

        return state.balance || 0;
    }

    startMine() {
        setInterval(() => {

            // Choose txs from txPool
            if (this.txPool.length === 0) return;
            let txs = this.txPool.slice(0, params.BLOCK_SIZE)

            // Create new block
            let block = new Block(txs, this.chain.getLatestBlockHash(), params.DIFFICULTY);

            while (!block.isHashValid()) {
                block.makeNewHash();
            }

            // Insert new valid block to blockchain
            this.chain.addBlock(block);

            // Execute to fill cache table
            this.execBlock(block);

            // remove mined txs from pool
            this.txPool.splice(0, block.txs.length);

            console.log("MINED~~ YEAH");//, block);

            // Broadcast to neighbor nodes
            // TODO: later

        }, 1000);
    }
}