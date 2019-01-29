const _ = require('lodash');
const utils = require('./helper/utils');
const params = require("./Params");
const Block = require('./Block');
const ecc = require('./helper/ecc')
const {getRunner, Context} = require('./vm')

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

    addReceipt(tx, block, error, status, result) {
        let r = this.receipts[tx.hash] || {};
        r = {
            ...r,
            ...tx,
            status,
            error: String(error),
            result
        }
        if (block) {
            r.blockNumber = block.number;
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
            const ctx = Context.contextForWrite(tx, block, t, options);
            const vm = getRunner(t[scAddr].mode)
            const result = vm.run(t[scAddr].src, ctx)

            // save back the state
            t[scAddr].state = Object.assign(t[scAddr].state || {}, ctx._state);

            return result;
        }
    }

    doExecTx(tx, block, stateTable) {

        // deploy contract
        if (tx.isContractCreation()) {

            // make new address for smart contract
            let scAddr = "contract_" + Date.now() + "_" + tx.from.substr(21);
            tx.to = scAddr;

            const src = decodeURIComponent(Buffer.from(tx.data.src, 'base64').toString("ascii"));
            const mode = tx.data.mode;
            const deployedBy = tx.from;
            const vm = getRunner(mode);
            const compileSrc = vm.compile(src);
            vm.verify(compileSrc);

            stateTable[scAddr] = {
                balance: 0,
                mode,
                deployedBy,
                src: compileSrc
            };

            // call constructor
            this.callContract(tx, block, stateTable, {
                fname: "__on_deployed"
            })
        }

        // call contract
        if (tx.isContractCall()) {
            if (['constructor', '__on_received', '__on_deployed', 'getState', 'setState', 'getEnv'].includes(tx.data.name)) {
                throw new Error('Calling this method directly is not allowed');
            }
            return this.callContract(tx, block, stateTable);
        }

        // process value transfer
        utils.decBalance(tx.from, parseFloat(tx.value || 0) + parseFloat(tx.fee || 0), stateTable)
        utils.incBalance(tx.to, tx.value, stateTable);
        utils.incBalance("miner", tx.fee, stateTable);

        if (tx.value && stateTable[tx.to].src && !tx.isContractCreation() && !tx.isContractCall()) {
            this.callContract(tx, block, stateTable, {
                address: tx.to,
                fname: "__on_received"
            })
        }
    }

    execTx(tx, block) {
        // clone the state so that we could revert on exception
        var tmpStateTable = _.cloneDeep(this.stateTable);
        try {
            const result = this.doExecTx(tx, block, tmpStateTable);
            Object.assign(this.stateTable, tmpStateTable);
            this.addReceipt(tx, block, null, "Success", result);
        } catch (error) {
            this.addReceipt(tx, block, error, "Error")
            console.log(error);
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

    getAllPropertyNames(obj, filter) {
        var props = [];
    
        do {
            Object.getOwnPropertyNames(obj).forEach(prop => {
                if (!props.includes(prop)) {
                    props.push(prop);
                }
            });
        } while ((obj = Object.getPrototypeOf(obj)) && obj != Object.prototype);
    
        //console.log(props);
        return props;
    }

    callViewFunc(addr, name, params) {
        if (this.stateTable[addr] && this.stateTable[addr].src) {
            const vm = getRunner(this.stateTable[addr].mode)
            return vm.run(this.stateTable[addr].src, Context.contextForView(this.stateTable, addr, name, params));
        }

        throw new Error("The address supplied is not a deployed contract")
    }

    callPureFunc(addr, name, params) {
        if (this.stateTable[addr] && this.stateTable[addr].src) {
            const vm = getRunner(this.stateTable[addr].mode);
            return vm.run(this.stateTable[addr].src, Context.contextForPure(addr, name, params));
        }

        throw new Error("The address supplied is not a deployed contract")
    }

    getFuncNames(addr) {
        if (this.stateTable[addr] && this.stateTable[addr].src) {
            const vm = getRunner(this.stateTable[addr].mode)
            const info = {};
            vm.run(this.stateTable[addr].src, Context.dummyContext, info);

            //console.log(info);

            if (!info || !info._i) return [];

            function isEvent(name) {
                if (!info._mk) return false;
                return (info._mk['deployed'] || []).includes(name) ||
                    (info._mk['received'] || []).includes(name);
            }

            const props = this.getAllPropertyNames(info._i);
            const excepts = ['constructor', '__on_deployed', '__on_received', 'getEnv', 'getState', 'setState'];
            return props.filter((name) => {
                return !excepts.includes(name) && !isEvent(name);
            });

        }

        return [];
    }

    getReceipts() {
        return _.cloneDeep(this.receipts || {});
    }

    getBlocks() {
        return _.cloneDeep(this.chain.blocks || [])
    }

    startMine() {
        setInterval(() => {

            // Choose txs from txPool
            if (this.txPool.length === 0) return;
            let txs = this.txPool.slice(0, params.BLOCK_SIZE)

            // Create new block
            let block = new Block(this.chain.getLatestBlockNumber() + 1, txs, this.chain.getLatestBlockHash(), params.DIFFICULTY);

            while (!block.isHashValid()) {
                block.makeNewHash();
            }

            // Insert new valid block to blockchain
            this.chain.addBlock(block);

            // Execute to fill cache table
            this.execBlock(block);

            // remove mined txs from pool
            this.txPool.splice(0, block.txs.length);

            // console.log("MINED~~ YEAH");//, block);

            // Broadcast to neighbor nodes
            // TODO: later

        }, 1000);
    }
}