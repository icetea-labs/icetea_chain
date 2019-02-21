// for testing with NodeJS
//const fetch = require('node-fetch');

import {switchEncoding, encodeTX, tryParseJson} from './utils';
// import { debug } from 'util';

function decodeEventData(tx) {
    if (!tx.tx_result || !tx.tx_result.tags|| !tx.tx_result.tags.length) {
        return {};
    }

    const b64Tags = tx.tx_result.tags;
    const tags = {};
    // decode tags
    b64Tags.forEach(t => {
        const key = switchEncoding(t.key, "base64", "utf8");
        const value = switchEncoding(t.value, "base64", "utf8");
        tags[key] = tryParseJson(value);
    });

    if (!tags.EventNames) {
        return {};
    }

    const events = tags.EventNames.split("|");
    if (!events.length) {
        return {};
    }

    const result = events.reduce((r, e) => {
        if (e) {
            r[e] = Object.keys(tags).reduce((data, key) => {
                if (key.startsWith(e + ".")) {
                    const parts = key.split(".", 2);
                    if (parts.length === 2) {
                        const name = parts[1];
                        const value = tags[key];
                        data[name] = value;
                    }
                } else if (key === e) {
                    Object.assign(data, tags[key])
                }
                return data;
            }, {});
        }
        return r;
    }, {});

    // what we want to return:
    // {
    //     Transferred: {
    //         from: "xxx",
    //         to: "xxx",
    //         amount: 100
    //     }
    // }

    return result;
}

/**
 * The IceTea web client.
 */
export default class IceTeaWeb3 {

    /**
     * Initialize the IceTeaWeb3 instance.
     * @param {string} endpoint tendermint endpoint, e.g. http://localhost:26657 
     */
    constructor(endpoint) {
        this.rpc = new HttpProvider(endpoint);

        this.utils = {
            decodeEventData
        }
    }

    /**
     * Get a single block.
     * @param {*} options example {height: 10}, skip to get latest block.
     * @returns the tendermint block.
     */
    getBlock(options) {
        return this.rpc.call("block", options);
    }

    /**
     * Get a list of blocks.
     * @param {*} options optional, e.g. {minHeight: 0, maxHeight: 10}
     * @returns {Array} an array of tendermint blocks
     */
    getBlocks(options) {
        return this.rpc.call("blockchain", options);
    }

    /**
     * Get a single transaction.
     * @param {string} hash required, hex string without '0x'.
     * @param {*} options optional, e.g. {prove: true} to request proof.
     * @return {*} the tendermint transaction.
     */
    getTransaction(hash, options) {
        if (!hash) {
            throw new Error("hash is required");
        }
        return this.rpc._call("tx", {hash: switchEncoding(hash, "hex", "base64"), ...options})
        .then(r => {
            if (r.result && r.result.tx_result && r.result.tx_result.data) {
                r.result.tx_result.data = tryParseJson(switchEncoding(r.result.tx_result.data, "base64", "utf8"));
            }
            
            return [r.result, r.error];
        })
    }

    /**
     * Search for transactions met the query specified.
     * @param {string} query required, query based on tendermint indexed tags, e.g. "tx.height>0".
     * @param {*} options additional options, e.g. {prove: true, page: 2, per_page: 20}
     * @returns {Array} Array of tendermint transactions.
     */
    searchTransactions(query, options) {
        if (!query) {
            throw new Error('query is required, example "tx.height>0"');
        }
        return this.rpc.call("tx_search", {query, ...options});
    }

    /**
     * Search for events emit by contracts.
     * @param {string} eventName the event name, e.g. "Transfered" 
     * @param {*} conditions required, string or object literal.
     * string example: "tx.height>0 AND someIndexedField CONTAINS 'kkk'".
     * Object example: {fromBlock: 0, toBlock: 100, someIndexedField: "xxx"}.
     * Note that conditions are combined using AND, no support for OR.
     * @param {*} options additional options, e.g. {prove: true, page: 2, per_page: 20}
     * @returns {Array} Array of tendermint transactions containing the event.
     */
    getPastEvents(eventName, conditions, options) {
        let query = "";
        if (typeof options === "string") {
            query = options;
        } else {
            query = Object.keys(conditions).reduce((arr, key) => {
                const value = conditions[key];
                if (key === "fromBlock") {
                    arr.push(`tx.height>${value-1}`)
                } else if (key === "toBlock") {
                    arr.push(`tx.height<${value+1}`)
                } else {
                    arr.push(`${key}=${value}`)
                }
                return arr;
            }, [`EventNames CONTAINS '|${eventName}|'`]).join(" AND ");
        }

        return this.searchTransactions(query, options);
    }

    /**
     * @return {string[]} Get all deployed smart contracts.
     */
    getContracts() {
        return this.rpc.query("contracts");
    }

    /**
     * Get all public methods and fields of a contract.
     * @param {string} contractAddr the contract address.
     * @returns {string[]} methods and fields array.
     */
    getFunctionList(contractAddr) {
        return this.rpc.query("funcs", contractAddr);
    }

    /**
     * @private
     */
    getDebugState() {
        return this.rpc.query("state");
    }

    /**
     * Send a transaction and return immediately.
     * @param {*} tx the transaction object.
     */
    sendTransactionAsync(tx) {
        return this.rpc.send("broadcast_tx_async", tx);
    }

    /**
     * Send a transaction and wait until it reach mempool.
     * @param {*} tx the transaction object.
     */
    sendTransactionSync(tx) {
        return this.rpc.send("broadcast_tx_sync", tx);
    }

    /**
     * Send a transaction and wait until it is included in a block.
     * @param {*} tx the transaction object.
     */
    sendTransactionCommit(tx) {
        return this.rpc.send("broadcast_tx_commit", tx);
    }

    /**
     * Call a readonly (@view) contract method or field.
     * @param {string} contract required, the contract address.
     * @param {string} method required, method or field name. 
     * @param {Array} params method params, if any.
     * @param {*} options optional options, e.g. {from: 'xxx'}
     */
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
