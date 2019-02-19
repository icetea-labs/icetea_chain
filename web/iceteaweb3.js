// for testing with NodeJS
//const fetch = require('node-fetch');

import {switchEncoding, encodeTX} from './utils';
import { debug } from 'util';

export default class IceTeaWeb3 {
    constructor(endpoint) {
        this.rpc = new HttpProvider(endpoint);
    }

    // get a single block
    // options example: {height: 10}
    // ignore options to get latest block
    getBlock(options) {
        return this.rpc.call("block", options);
    }

    // get a list of blocks
    // options example: {minHeight: 0, maxHeight: 10}
    getBlocks(options) {
        return this.rpc.call("blockchain", options);
    }

    // get a single TX
    // options example {prove: true}
    getTransaction(hash, options) {
        if (!hash) {
            throw new Error("hash is required");
        }
        return this.rpc._call("tx", {hash: switchEncoding(hash, "hex", "base64"), ...options})
        .then(r => {
            if (r.result && r.result.tx_result && r.result.tx_result.data) {
                r.result.tx_result.data = switchEncoding(r.result.tx_result.data, "base64", "utf8");
            }
            
            return [r.result, r.error];
        })
    }

    // search, return a list of transaction
    // example query: "tx.height>0"
    searchTransactions(query, options) {
        if (!query) {
            throw new Error('query is required, example "tx.height>0"');
        }
        return this.rpc.call("tx_search", {query, ...options});
    }

    getContracts() {
        return this.rpc.query("contracts");
    }

    getFunctionList(contractAddr) {
        return this.rpc.query("funcs", contractAddr);
    }

    getDebugState() {
        return this.rpc.query("node");
    }

    // send a transaction and return immediately
    sendTransactionAsync(tx) {
        return this.rpc.send("broadcast_tx_async", tx);
    }

    // send a transaction and wait until it reach mempool
    sendTransactionSync(tx) {
        return this.rpc.send("broadcast_tx_sync", tx);
    }

    // send a transaction and wait until it is included in a block
    sendTransactionCommit(tx) {
        return this.rpc.send("broadcast_tx_commit", tx);
    }

    callReadonlyContractMethod(contract, method, params = [], options={}) {
        return this.rpc.query("call", {address: contract, name: method, params, options});
    }

    // shorthand for transfer, deploy, write, read contract goes here
    // subscribe, unsubscribe goes here (for WebSocket only)

}

// TODO: add WebSocketProvider

export class HttpProvider {
    constructor(endpoint) {
        this.endpoint = endpoint;
    }

    _call(method, params = {}) {
        const json = {
            jsonrpc: "2.0",
            id: Date.now(),
            method,
            params
        }
        if (typeof params !== 'undefined') {
            json.params = params;
        }

        return fetch(this.endpoint, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json; charset=utf-8'
            },
            body: JSON.stringify(json)
        })
        .then(resp => resp.json())
    }

    // call a jsonrpc, normally to query blockchain (block, tx, validator, consensus, etc.) data
    call(method, params) {
        return this._call(method, params).then(resp => ([resp.result, resp.error]))
    }

    // query application state (read)
    query(path, data, options) {
        const params = {path, ...options};
        if (data) {
            if (typeof data !== "string") {
                data = JSON.stringify(data);
            }
            params.data = switchEncoding(data, "utf8", "hex");
        }

        return this._call("abci_query", params).then(resp => {
            let r = resp.result;
            if (r && r.response && r.response.info) {
                r = JSON.parse(r.response.info);
            }
            return [r, resp.error];
        })
    }

    // send a transaction (write)
    send(method, tx) {
        return this.call(method, {
            // for jsonrpc, encode in 'base64'
            // for query string (REST), encode in 'hex' (or 'utf8' inside quotes)
            tx: encodeTX(tx, 'base64')
        })
    }
}
