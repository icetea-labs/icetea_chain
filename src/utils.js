import ecc from '../blockchain/helper/ecc';
import Tx from "../blockchain/Tx";

const msgpack = require('msgpack5')();

export function replaceAll(text, search, replacement) {
    return text.split(search).join(replacement);
}

export function tryParseJson(p) {
    try {
        return JSON.parse(p);
    } catch (e) {
        //console.log("WARN: ", e);
        return p;
    }
}

export function tryStringifyJson(p) {
    try {
        return JSON.stringify(p);
    } catch (e) {
        //console.log("WARN: ", e);
        return p;
    }
}

export function toBase64(text) {
    if (!text.length) return null;
    return btoa(encodeURIComponent(text));
}

export function fieldToBase64(selector) {
    return toBase64(document.querySelector(selector).value.trim());
}

export function parseParamList(pText) {
    pText = replaceAll(pText, "\r", "\n");
    pText = replaceAll(pText, "\n\n", "\n");
    let params = pText.split("\n").filter(e => e.trim()).map(tryParseJson);

    return params;
}

export function parseParamsFromField(selector) {
    return parseParamList(document.querySelector(selector).value.trim())
}

export function queryState(path, data) {
    let url = '/api/abci_query?path="' + path + '"';
    if (data) {
        url += '&data="' + data + '"';
    }
    return fetch(url).then(resp => resp.json()).then(json => {
        console.log(json)
        if (!json.error && !json.result.response.code) {
            return [JSON.parse(json.result.response.info), null];
        } else {
            return [null, json.error || json.result.response.info];
        }
    });
}

export function queryChain(path, data) {
    let url = '/api/' + path;
    if (data) {
        url += '?data="' + data + '"';
    }
    return fetch(url).then(resp => resp.json()).then(json => {
        console.log(json)
        if (!json.error) {
            return [json.result, null];
        } else {
            return [null, json.error];
        }
    });
}

export function registerTxForm($form, txData) {
    $form.submit(function(e) {
        e.preventDefault();

        if (typeof txData === 'function') {
            txData = txData();
            if (!txData) return;
        }
        txData = txData || {};

        var formData = $form.serializeArray().reduce(function (obj, item) {
            obj[item.name] = item.value;
            return obj;
        }, {});

        //console.log(txData)
        formData.data = JSON.stringify(txData);
        const privateKey = $("#private_key").val().trim();
        formData.from = ecc.toPublicKey(privateKey);
        var tx = new Tx(formData.from, formData.to, formData.value, formData.fee, txData);
        formData.nonce = tx.nonce;
        formData.signature = ecc.sign(tx.tHash, privateKey);

        //submit tx
        $.ajax({
            url: "/api/broadcast_tx_sync?tx=0x" + msgpack.encode(formData).toString("hex"),
            method: "GET",
            success: function (result) {
                console.log(result);
                if (!result.error && result.result && result.result.code === 0) {
                   window.location.href = '/tx.html?hash=' + encodeURIComponent(result.result.data).toLowerCase();
                } else {
                    console.log(result)
                    if (result.error) {
                        alert(result.error.data)
                    } else {
                        alert(result.result.log);
                    }
                }
            }
        });
    })
}
