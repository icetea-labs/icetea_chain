import $ from 'jquery'
import { parseParamsFromField, registerTxForm } from './helper'
window.$ = $

function buildData () {
  return {
    params: parseParamsFromField('#params')
  }
}
registerTxForm($('#form'), buildData)
