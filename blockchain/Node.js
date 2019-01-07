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

    incBalance(addr, delta, stateTable) {
        const t = stateTable;
        t[addr] = t[addr] || {balance: 0};
        t[addr].balance += parseFloat(delta) || 0;
    }

    decBalance(addr, delta, stateTable) {
        this.incBalance(addr, -delta, stateTable);
    }

    makeContractCallEnv(tx, block, stateTable, options) {
        const msg = _.cloneDeep(tx);
        msg.name = options.fname;
        msg.params = options.fparams;
        msg.sender = msg.from; // alias

        const addr = options.address;

        const theBlock = _.cloneDeep(block);

        const state = _.cloneDeep(stateTable[addr].state || {});

        const balance = this.balanceOf(addr, stateTable);

        const that = {
            address: addr,
            state: state,
            balance: balance,
            transfer: (to, value) => {
                this.decBalance(addr, value, stateTable);
                this.incBalance(to, value, stateTable);
            },
            $$: (obj) => {
                return _.extend(that, obj);
            }
        }

        return [that, msg, theBlock];
    }

    verifyContractSrc(src) {
        const f = new Function("module", src);
        const module = {};
        f(module);

        if (!module.exports) {
            throw new Error("The contract does not set module.exports.")
        }

        return {
            onDeploy: !!module.exports.$onDeploy,
            onReceive: !!module.exports.$onReceive
        }
    }

    callContractFunc(tx, block, stateTable, options) {
        options = _.extend({
            address: tx.to,
            fname: tx.data.name,
            fparams: tx.data.params
        }, options || {});
        let scAddr = options.address;
        const t = stateTable;
        if (!t[scAddr] || !t[scAddr].src) {
            throw new Error("Invalid contract call");
        } else {
            const [that, msg, theBlock] = this.makeContractCallEnv(tx, block, t, options)
            const f = new Function("module", "msg", "block", "now", t[scAddr].src);
            f.call(that, {}, msg, theBlock, theBlock.timestamp);

            // save back the state
            t[scAddr].state = _.extend(t[scAddr].state || {}, that.state);
        }
    }

    doExecTx(tx, block, stateTable) {

        // deploy contract
        if (tx.isContractCreation()) {
            // make new address for smart contract
            let scAddr = "contract_" + tx.from + "_" + Date.now();
            tx.to = scAddr;

            let src = Buffer.from(tx.data.src, 'base64').toString("ascii");
            const state = this.verifyContractSrc(src);
            state.balance = 0;
            state.src = src + ';typeof msg !== "undefined" && msg.name && module.exports[msg.name].apply(this.$$(module.exports), msg.params);';
            stateTable[scAddr] = state;

            // call constructor
            if (state.onDeploy) {
                this.callContractFunc(tx, block, stateTable, {
                    fname: "$onDeploy"
                })
            }
        }

        // call contract
        if (tx.isContractCall()) {
            this.callContractFunc(tx, block, stateTable);
        }

        // process value transfer
        this.decBalance(tx.from, parseFloat(tx.value || 0) + parseFloat(tx.fee || 0), stateTable)
        this.incBalance(tx.to, tx.value, stateTable);
        this.incBalance("miner", tx.fee, stateTable);

        if (tx.value && stateTable[tx.to].onReceive) {
            this.callContractFunc(tx, block, stateTable, {
                address: tx.to,
                fname: "$onReceive",
                fparams: [tx.value]
            })
        }
    }

    execTx(tx, block) {
        // clone the state so that we could revert on exception
        var tmpStateTable = _.cloneDeep(this.stateTable);
        try {
            this.doExecTx(tx, block, tmpStateTable);
            _.extend(this.stateTable, tmpStateTable);
        } catch (error) {
            console.log(error);
        }
    }

    execBlock(block) {
        block.txs.forEach(tx => {
            this.execTx(tx, block);
        });

        this.incBalance("miner", params.MINER_REWARD, this.stateTable);
    }

    balanceOf(who, t) {
        const state = (t || this.stateTable)[who];
        if (!state) return 0;

        return state.balance || 0;
    }

    getContractAddresses() {
        const arr = [];
        _.each(this.stateTable, (value, key) => {
            if (key.startsWith("contract_")) {
                arr.push(key);
            }
        });

        return arr;
    }

    getFuncNames(addr) {
        const arr = [];
        if (this.stateTable[addr] && this.stateTable[addr].src) {
            const f = new Function("module", this.stateTable[addr].src);
            const module = {};
            f(module);

            _.each(module.exports, (value, key) => {
                if (typeof value === "function") {
                    arr.push(key);
                }
            });

        }

        return arr;
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