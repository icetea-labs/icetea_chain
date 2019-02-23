import $ from 'jquery'
import { parseParamsFromField, registerTxForm } from './domhelper'
window.$ = $

function buildData () {
  return {
    params: parseParamsFromField('#params')
  }
}
registerTxForm($('#form'), buildData)
