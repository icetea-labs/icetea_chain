import * as utils from './utils';

function buildData() {
    return {
        op: 0,
        mode: +document.getElementById("srcMode").value,
        src: utils.fieldToBase64("#src"),
        params: utils.parseParamsFromField("#params")
    }
}

utils.registerTxForm($('#form'), buildData, $("#private_key").val().trim());
