import JSONFormatter from 'json-formatter-js';
import handlebars from 'handlebars/dist/handlebars.min.js';
import {query} from './utils';

const blockTemplate = handlebars.compile(document.getElementById("blockTemplate").innerHTML);
const txTemplate = handlebars.compile(document.getElementById("txTemplate").innerHTML);

function fmtTime(tm) {
    return new Date(tm * 1000).toLocaleTimeString();
}

function fmtHex(hex, c) {
    if (!hex || hex.length < c * 2 + 4) return hex;
    c = c || 4;
    return hex.substr(0, c) + "..." + hex.substr(-c);
}

function fmtBlocks(blocks) {
    blocks.forEach(b => {
        b.shash = fmtHex(b.hash, 6);
        b.timestamp = fmtTime(b.timestamp);
        b.txCount = b.txs.length;
    });
    return blocks;
}

function fmtTxs(txs) {
    Object.keys(txs).forEach(k => {
        const t = txs[k];
        t.shash = fmtHex(t.tHash);
        t.blockTimestamp = fmtTime(t.blockTimestamp);
        t.from = fmtHex(t.from);
        t.to = fmtHex(t.to);
        t.txType = "transfer";
        t.data = t.data || {};
        if (t.data.op === 0) {
            t.txType = "create contract";
        } else if (t.data.op === 1) {
            t.txType = "call contract";
        }
    });
    return txs;
}

function showMessage() {
    // parse message to show
    var parts = location.href.split("?");
    if (parts.length > 1) {
        document.getElementById("info").textContent = decodeURIComponent(parts[1]);
        setTimeout(() => {
            document.getElementById("info").textContent = "";
        }, 4000);
    }
}

let blockCount = 0;
async function loadData() {
    // load block info
    const [myBlocks,] = await query("blocks");
    if (myBlocks && myBlocks.length && myBlocks.length > blockCount) {
        blockCount = myBlocks.length;

        document.getElementById("blocks").innerHTML = blockTemplate(fmtBlocks(myBlocks));

        // load txs info
        const [myTxs, err] = await query("txs");
        if (err) {
            console.log("Error fetching TX list", err);
            return;
        }
        document.getElementById("transactions").innerHTML = txTemplate(fmtTxs(myTxs));

        // load debug info
        const [myJSON, err2] = await query("node");
        if (err2) {
            console.log("Error fetching debug info", err2);
            return;
        }
        const formatter = new JSONFormatter(myJSON, 1);
        document.getElementById("debug").innerHTML = "";
        document.getElementById("debug").appendChild(formatter.render());
    }
}

(() => {
    showMessage();
    loadData();
    setInterval(loadData, 3500);
})();