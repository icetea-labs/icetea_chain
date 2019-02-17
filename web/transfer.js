import $ from 'jquery';
window.$ = $;
import {parseParamsFromField, registerTxForm} from './domhelper';

function buildData() {
    return {
        params: parseParamsFromField("#params")
    }
}
registerTxForm($('#form'), buildData);
