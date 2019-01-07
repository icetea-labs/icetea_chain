const _ = require('lodash');
const params = require("./Params");
const Block = require('./Block');

module.exports = class Node {

    constructor (chain, txPool) {
        this.chain = chain;
        this.txPool = txPool || [];
        this.stateTable = {
            miner: {
                balance: 0,
            }
        }
    }

    incBalance(addr, delta) {
        const t = this.stateTable;
        t[addr] = t[addr] || {balance: 0};
        t[addr].balance += parseFloat(delta) || 0;
    }

    decBalance(addr, delta) {
        this.incBalance(addr, -delta);
    }

    scEnv(tx, block) {
        const msg = _.cloneDeep(tx);
        msg.sender = msg.from; // alias

        const addr = msg.to;

        const theBlock = _.cloneDeep(block);

        const state = _.cloneDeep(this.stateTable[addr].state || {});

        const that = {
            address: addr,
            state: state,
            transfer: (to, value) => {
                this.decBalance(addr, value);
                this.incBalance(to, value);
            }
        }

        return [that, msg, theBlock];
    }

    execTx(tx, block) {

        this.decBalance(tx.from, parseFloat(tx.value || 0) + parseFloat(tx.fee || 0))
        this.incBalance(tx.to, tx.value);
        this.incBalance("miner", tx.fee);

        if (!tx.data || typeof tx.data.op === "undefined") return;

        if (tx.data.op == 0) {
            // make a address for smart contract
            let scAddr = tx.from + "_" + Date.now();
            this.stateTable[scAddr] = {
                balance: 0,
                src: Buffer.from(tx.data.src, 'base64').toString("ascii")
            }

            return;
        }

        if (tx.data.op == 1) {
            let scAddr = tx.to;
            const t = this.stateTable;
            if (!t[scAddr] || !t[scAddr].src) {
                console.log("Invalid contract call");
            } else {
                const [that, msg, theBlock] = this.scEnv(tx, block)
                const f = new Function("msg", "block", "now", t[scAddr].src);
                f.call(that, msg, theBlock, theBlock.timestamp);

                // save back the state
                t[scAddr].state = _.extend(t[scAddr].state || {}, that.state);
            }
        }
    }

    execBlock(block) {
        block.txs.forEach(tx => {
            this.execTx(tx, block);
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