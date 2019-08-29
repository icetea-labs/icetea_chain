// import JSONFormatter from 'json-formatter-js'
import handlebars from 'handlebars/dist/handlebars.min.js'
// import { utils } from '@iceteachain/web3'
import tweb3 from './tweb3'
import $ from 'jquery'
import { fmtHex } from './helper'
import { toTEA } from './common'

const candidateTemplate = handlebars.compile(document.getElementById('candidateTemplate').innerHTML)

const microTEAtoTEA = (microTEA) => {
  return toTEA(microTEA).toLocaleString() + ' TEA'
}

const formatCandidates = (candidates) => {
  /**
     * `TODO`: `handle the case when candidate's NAME is way too long` by `click hover`
     */

  candidates.forEach(candidate => {
    candidate.pubkeyText = fmtHex(candidate.pubKey.data, 4)
    candidate.capacityText = microTEAtoTEA(candidate.capacity)
    candidate.operatorText = fmtHex(candidate.operator, 4)
  })
  return candidates
}

$(document).ready(async function () {
  const result = await tweb3['callReadonlyContractMethod']('system.election', 'getCandidates', [])
  document.getElementById('candidates').innerHTML = candidateTemplate(formatCandidates(result))

  $('button.vote[data-pubkey]').on('click', function () {
    var pubkey = this.getAttribute('data-pubkey')
    window.alert('You vote for pubkey: ' + pubkey)
  })

  $('button.resign[data-pubkey]').on('click', function () {
    var pubkey = this.getAttribute('data-pubkey')
    window.alert('You resign pubkey: ' + pubkey)
  })
})
