const _ = require('lodash');
const utils = require('./helper/utils');
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
        this.receipts = {};
    }

    addReceipt(tx, block, error, status) {
        let r = this.receipts[tx.hash] || {};
        r = {
            ...r,
            ...tx,
            status,
            error: String(error),
        }
        if (block) {
            r.blockHash = block.hash;
            r.blockTimestamp = block.timestamp;
        }
        this.receipts[tx.hash] = r;
        return r;
    }

    getReceipt(txHash) {
        if (!txHash) return null;
        return this.receipts[txHash];
    }

    addTxToPool(tx) {
        if (!ecc.verifyTx(tx)) {
            throw new Error("Invalid signature");
        }

        this.txPool.push(tx);
        this.addReceipt(tx, null, null, "Pending");
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
            throw new Error(`Address ${scAddr} is not a valid contract`);
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
            let scAddr = "contract_" + tx.from.substr(22) + Date.now();
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
        utils.decBalance(tx.from, parseFloat(tx.value || 0) + parseFloat(tx.fee || 0), stateTable)
        utils.incBalance(tx.to, tx.value, stateTable);
        utils.incBalance("miner", tx.fee, stateTable);

        if (tx.value && stateTable[tx.to].src) {
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
            Object.assign(this.stateTable, tmpStateTable);
            this.addReceipt(tx, block, null, "Success");
        } catch (error) {
            this.addReceipt(tx, block, error, "Error")
            //console.log(error);
        }
    }

    execBlock(block) {
        block.txs.forEach(tx => {
            this.execTx(tx, block);
        });

        utils.incBalance("miner", params.MINER_REWARD, this.stateTable);
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
            const vm = new Runner();
            const info = {};
            vm.run(this.stateTable[addr].src, {
                getEnv: () => ({msg: {}, block:{}}),
                getState: () => null,
                setState: value => {}
            }, info);

            //console.log(info);

            if (!info || !info._i) return [];

            function isEvent(name) {
                if (!info._mk) return false;
                return (info._mk['deployed'] || []).includes(name) ||
                    (info._mk['received'] || []).includes(name);
            }

            return Object.getOwnPropertyNames(Object.getPrototypeOf(info._i)).filter((name) => {
                return name !== "constructor" && !isEvent(name);
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