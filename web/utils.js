const msgpack = require('msgpack5')();
import SafeBuffer from 'safe-buffer'

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

export function parseParamList(pText) {
    pText = replaceAll(pText, "\r", "\n");
    pText = replaceAll(pText, "\n\n", "\n");
    let params = pText.split("\n").filter(e => e.trim()).map(tryParseJson);

    return params;
}

/*
// @deprecated Use IceTeaWeb3 instead
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

// @deprecated Use IceTeaWeb3 instead
export function queryChain(path, queryString) {
    let url = '/api/' + path;
    if (queryString) {
        url += '?' + queryString;
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
*/

export function encodeTX(data, enc = "base64") {
    return msgpack.encode(data).toString(enc)
}

export function toBuffer(text, enc) {
    return SafeBuffer.Buffer.from(text, enc)
}

export function switchEncoding(str, from, to) {
    return SafeBuffer.Buffer.from(str, from).toString(to);
}

export function decodeTX(data, enc = "base64") {
    return msgpack.decode(toBuffer(data, enc));
}

