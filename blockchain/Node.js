const _ = require('lodash');
const params = require("./Params");
const Block = require('./Block');
const ecc = require('./helper/ecc')
const {Runner, Context} = require('./vm')

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

    addTxToPool(tx) {
        if (!ecc.verifyTx(tx)) {
            throw "Invalid signature";
        }

        this.txPool.push(tx);
    }

    incBalance(addr, delta, stateTable) {
        const t = stateTable;
        t[addr] = t[addr] || {balance: 0};
        t[addr].balance += parseFloat(delta) || 0;
    }

    decBalance(addr, delta, stateTable) {
        this.incBalance(addr, -delta, stateTable);
    }

    callContract(tx, block, stateTable, overrides) {
        const options = Object.assign({
            address: tx.to,
            fname: tx.data.name,
            fparams: tx.data.params
        }, overrides || {});

        let scAddr = options.address;
        const t = stateTable;
        if (!t[scAddr] || !t[scAddr].src) {
            throw "Invalid contract call";
        } else {
            const ctx = Context(tx, block, t, options);
            const vm = new Runner();
            vm.run(t[scAddr].src, ctx)

            // save back the state
            t[scAddr].state = Object.assign(t[scAddr].state || {}, ctx._state);
        }
    }

    doExecTx(tx, block, stateTable) {

        // deploy contract
        if (tx.isContractCreation()) {

            // make new address for smart contract
            let scAddr = "contract_" + tx.from + "_" + Date.now();
            tx.to = scAddr;

            const src = Buffer.from(tx.data.src, 'base64').toString("ascii");
            const vm = new Runner();
            const compileSrc = vm.compile(src);
            vm.verify(compileSrc);

            stateTable[scAddr] = {
                balance: 0,
                src: compileSrc
            };

            // call constructor
            this.callContract(tx, block, stateTable, {
                fname: "__on_deployed"
            })
        }

        // call contract
        if (tx.isContractCall()) {
            this.callContract(tx, block, stateTable);
        }

        // process value transfer
        this.decBalance(tx.from, parseFloat(tx.value || 0) + parseFloat(tx.fee || 0), stateTable)
        this.incBalance(tx.to, tx.value, stateTable);
        this.incBalance("miner", tx.fee, stateTable);

        if (tx.value) {
            this.callContract(tx, block, stateTable, {
                address: tx.to,
                fname: "__on_received",
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
        if (this.stateTable[addr] && this.stateTable[addr].src) {
            const f = new Function("__c", this.stateTable[addr].src);
            const module = {};
            f(module);

            return Object.getOwnPropertyNames(Object.getPrototypeOf(module.i)).filter((name) => {
                return (name !== "constructor");
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