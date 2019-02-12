import ecc from '../blockchain/helper/ecc';
import Tx from "../blockchain/Tx";

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
        formData.signature = ecc.sign(tx.hash, privateKey)

        //submit tx
        $.ajax({
            url: "/api/send_tx",
            method: "POST",
            data: formData,
            success: function (result) {
                if (result.success) {
                   window.location.href = '/tx.html?hash=' + encodeURIComponent(result.data.tx_hash)
                } else {
                    alert(result.error)
                }
            }
        });
    })
}
