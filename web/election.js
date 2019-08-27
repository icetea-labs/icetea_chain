// import JSONFormatter from 'json-formatter-js'
import handlebars from 'handlebars/dist/handlebars.min.js'
// import { utils } from '@iceteachain/web3'
import tweb3 from './tweb3'
import $ from 'jquery'
import { fmtHex } from './helper'
import { toTEA } from './common'

const candidateTemplate = handlebars.compile(document.getElementById('candidateTemplate').innerHTML)

const formatCandidates = (candidates) => {
  /**
     * `TODO`: `handle the case when NAME is way too long`
     */

  candidates.forEach(candidate => {
    candidate.addressText = fmtHex(candidate.address, 6)
    candidate.deposit = toTEA(candidate.deposit).toLocaleString() + ' TEA'
  })
  return candidates
}

$(document).ready(async function () {
  const result = await tweb3['callReadonlyContractMethod']('system.election', 'getCandidates', [])
  document.getElementById('candidates').innerHTML = candidateTemplate(formatCandidates(result))
})
