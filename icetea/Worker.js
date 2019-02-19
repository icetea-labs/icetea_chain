const _ = require('lodash');
const config = require('./config');
const utils = require('./helper/utils');
const ecc = require('./helper/ecc')
const {getRunner, getContext, getGuard} = require('./vm')

module.exports = class Worker {

    constructor () {
        this.stateTable = {};
        //this.receipts = {};
        //this.blocks = [];
        this.init();
    }

    init(){
        _.each(config.initialStateTable, item => {
            utils.prepareState(item.address, this.stateTable, {
                balance: item.balance
            });
        });
    }

    // addReceipt(tx, block, error, status, result) {
    //     let r = this.receipts[tx.hash] || {};
    //     r = {
    //         ...r,
    //         ...tx,
    //         status,
    //         error: String(error),
    //         result
    //     }
    //     if (block) {
    //         r.blockNumber = block.number;
    //         r.blockTimestamp = block.timestamp;
    //     }

    //     this.receipts[tx.tHash] = r;
    //     return r;
    // }

    // getReceipt(txHash) {
    //     if (!txHash) return null;
    //     return this.receipts[txHash];
    // }

    beginBlock(block) {
        //this.blocks.push(block);
        this.lastBlock = block;
    }

    endBlock() {
        //utils.incBalance("miner", 5, this.stateTable);
    }

    commit() {

    }

    verifyTx(tx) {

        // To verify signature, we need the hash (or some representation of content)
        // But at the time client broad_tx, she does not know the tendermint's hash
        // which is not available until check_tx
        // Because it is unreliable to reproduce the way tendermint calculates hash
        // we use a separate content hash for signature checking

        // It is important that we wrap the way this content hash is generated
        // inside a web3-like lib's "sign" function

        if (!ecc.verifyTx(tx)) {
            throw new Error("Invalid signature");
        }
    }

    checkTx(tx) {

        // Check TX should not modify state
        // This way, we could avoid make a copy of state

        this.verifyTx(tx);

        // This will removed later, since we do not manage receipts at application state level
        //this.addReceipt(tx, null, null, "Pending");
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
            // should be deterministic
            const count = Object.keys(stateTable).reduce((t, k) => (
                (k.startsWith("contract_") && k.endsWith(tx.from)) ? (t + 1) : t), 0);
            let scAddr = "contract_" + count + "_" + tx.from;
            tx.to = scAddr;

            const mode = tx.data.mode;
            const src = Buffer.from(tx.data.src, 'base64');
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
            this.callContract(tx, block, stateTable, {
                fname: "__on_deployed"
            });
            result = scAddr;
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
        //utils.incBalance("miner", tx.fee, stateTable);

        if (tx.value && stateTable[tx.to].src && !tx.isContractCreation() && !tx.isContractCall()) {
            result = this.callContract(tx, block, stateTable, {
                address: tx.to,
                fname: "__on_received"
            })
        }

        return result;
    }

    async execTx(tx) {
        const block = this.lastBlock;

        // clone the state so that we could revert on exception
        var tmpStateTable = _.cloneDeep(this.stateTable);
        try {
            const result = await this.doExecTx(tx, block, tmpStateTable);
            // This should make sure 'balance' setter is maintained
            _.merge(this.stateTable, tmpStateTable);
            console.log(result)
            //this.addReceipt(tx, block, null, "Success", result);
            return result;
        } catch (error) {
            //this.addReceipt(tx, block, error, "Error")
            console.log(error)
           throw error;
        }
        //console.log("stateTable:",this.stateTable);
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

    callViewFunc(addr, name, params, options) {
        const block = this.lastBlock;
        options = Object.assign(options || {}, {block})

        if (this.stateTable[addr] && this.stateTable[addr].src) {
            const {mode, src} = this.stateTable[addr];
            const vm = getRunner(mode)
            const context = getContext(mode).contextForView(this.stateTable, addr, name, params, options);
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

    // getReceipts() {
    //     return _.cloneDeep(this.receipts || {});
    // }

    // getBlocks() {
    //     return _.cloneDeep(this.blocks || [])
    // }
}