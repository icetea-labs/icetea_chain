import {parseParamsFromField, registerTxForm} from './utils';

function buildData() {
    return {
        params: parseParamsFromField("#params")
    }
}
registerTxForm($('#form'), buildData, $("#private_key").val().trim());
