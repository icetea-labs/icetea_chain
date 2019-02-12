const _ = require('lodash');
const config = require('./config');
const utils = require('./helper/utils');
const params = require("./Params");
const Block = require('./Block');
const ecc = require('./helper/ecc')
const {getRunner, getContext, getGuard} = require('./vm')

module.exports = class Node {

    constructor (chain, txPool) {
        this.chain = chain;
        this.txPool = txPool || [];
        // this.stateTable = {
        //     miner: {
        //         balance: 0,
        //     }
        // }
        this.stateTable = {};
        this.receipts = {};
        this.init();
    }

    init(){
        _.each(config.initialStateTable, item => {
            utils.prepareState(item.address, this.stateTable, {
                balance: item.balance
            });
        });
        console.log("init_stateTable",this.stateTable);
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

    async callContract(tx, block, stateTable, overrides) {
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
            const {mode, src} = t[scAddr];
            const context = getContext(mode).contextForWrite(tx, block, t, options);
            const guard = getGuard(mode)(src);
            const vm = getRunner(mode);
            const result = await vm.run(src, {context, guard});

            // save back the state
            t[scAddr].state = Object.assign(t[scAddr].state || {}, context._state);

            return result;
        }
    }

    async doExecTx(tx, block, stateTable) {

        let result;

        // deploy contract
        if (tx.isContractCreation()) {

            // make new address for smart contract
            let scAddr = "contract_" + Date.now() + "_" + tx.from.substr(30);
            tx.to = scAddr;

            const mode = tx.data.mode;
            const src = (mode === 2) ? Buffer.from(tx.data.src, 'base64') 
                : decodeURIComponent(Buffer.from(tx.data.src, 'base64').toString("ascii"));
            const deployedBy = tx.from;
            const vm = getRunner(mode);
            const compiledSrc = vm.compile(src);
            vm.verify(compiledSrc); // linter & halt-problem checking

            utils.prepareState(scAddr, stateTable, {
                balance: 0,
                mode,
                deployedBy,
                src: compiledSrc
            });

            // call constructor
            result = this.callContract(tx, block, stateTable, {
                fname: "__on_deployed"
            })
        }

        // call contract
        if (tx.isContractCall()) {
            if (['constructor', '__on_received', '__on_deployed', 'getState', 'setState', 'getEnv'].includes(tx.data.name)) {
                throw new Error('Calling this method directly is not allowed');
            }
            result = this.callContract(tx, block, stateTable);
        }

        // process value transfer
        utils.decBalance(tx.from, parseFloat(tx.value || 0) + parseFloat(tx.fee || 0), stateTable)
        utils.incBalance(tx.to, tx.value, stateTable);
        utils.incBalance("miner", tx.fee, stateTable);

        if (tx.value && stateTable[tx.to].src && !tx.isContractCreation() && !tx.isContractCall()) {
            result = this.callContract(tx, block, stateTable, {
                address: tx.to,
                fname: "__on_received"
            })
        }

        return result;
    }

    async execTx(tx, block) {
        // clone the state so that we could revert on exception
        var tmpStateTable = _.cloneDeep(this.stateTable);
        try {
            const result = await this.doExecTx(tx, block, tmpStateTable);
            // This should make sure 'balance' setter is maintained
            _.merge(this.stateTable, tmpStateTable);
            this.addReceipt(tx, block, null, "Success", result);
        } catch (error) {
            this.addReceipt(tx, block, error, "Error")
            console.log(error);
        }
        console.log("stateTable:",this.stateTable);
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

    getAllPropertyNames(obj) {
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
            const {mode, src} = this.stateTable[addr];
            const vm = getRunner(mode)
            const context = getContext(mode).contextForView(this.stateTable, addr, name, params);
            const guard = getGuard(mode)(src);
            return vm.run(src, {context, guard});
        }

        throw new Error("The address supplied is not a deployed contract")
    }

    callPureFunc(addr, name, params) {
        if (this.stateTable[addr] && this.stateTable[addr].src) {
            const {mode, src} = this.stateTable[addr];
            const vm = getRunner(mode);
            const context = getContext(mode).contextForPure(addr, name, params);
            const guard = getGuard(mode)(src);
            return vm.run(src, {context, guard});
        }

        throw new Error("The address supplied is not a deployed contract")
    }

    getFuncNames(addr) {
        if (this.stateTable[addr] && this.stateTable[addr].src) {
            const mode = this.stateTable[addr].mode;
            const vm = getRunner(mode)
            const context = getContext(mode).dummyContext;
            const info = {};
            vm.run(this.stateTable[addr].src, {context, info});

            //console.log(info);

            if (!info || !info._i) return [];

            const props = this.getAllPropertyNames(info._i);
            const excepts = ['constructor', '__on_deployed', '__on_received', 'getEnv', 'getState', 'setState'];
            return ["address", "balance"].concat(props.filter((name) => !excepts.includes(name)));
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