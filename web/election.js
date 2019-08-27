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

const calCapacityInTEA = (candidate) => {
  const voters = candidate.voters
  const deposits = Object.values(voters).map(Number)
  const capacity = deposits.reduce((sum, deposit) => {
    return sum + deposit
  })
  return microTEAtoTEA(capacity)
}
const formatCandidates = (candidates) => {
  /**
     * `TODO`: `handle the case when candidate's NAME is way too long` by `click hover`
     */

  candidates.forEach(candidate => {
    candidate.addressText = fmtHex(candidate.address, 6)
    candidate.deposit = microTEAtoTEA(candidate.deposit)
    candidate.capacity = calCapacityInTEA(candidate)
  })
  return candidates
}

$(document).ready(async function () {
  const result = await tweb3['callReadonlyContractMethod']('system.election', 'getCandidates', [])
  document.getElementById('candidates').innerHTML = candidateTemplate(formatCandidates(result))
})
