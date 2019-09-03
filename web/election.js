import handlebars from 'handlebars/dist/handlebars.min.js'
import tweb3 from './tweb3'
import $ from 'jquery'
import { fmtHex, loadFromStorage } from './helper'
import { toTEA, toUNIT } from './common'

const candidateTemplate = handlebars.compile(document.getElementById('candidateTemplate').innerHTML)
const ms = tweb3.contract('system.election').methods

const microTEAtoTEA = (microTEA) => {
  return toTEA(microTEA).toLocaleString() + ' TEA'
}

const formatCandidates = (candidates) => {
  /**
     * `TODO`: `handle the case when candidate's NAME is way too long` by `click hover`
     * `address and pubKey are using interchangable`
     * `ISSUE`: when user click 'cancel' on VOTE button clicked popup
     */

  candidates.forEach(candidate => {
    candidate.pubkeyText = fmtHex(candidate.pubKey.data, 4)
    candidate.capacityText = microTEAtoTEA(candidate.capacity)
    candidate.operatorText = fmtHex(candidate.operator, 4)
  })
  return candidates
}

const vote = (candidate, value, from) => {
  const opts = { from: from }
  if (value) opts.value = value
  return ms.vote(candidate).sendCommit(opts)
}
const propose = (candidate, name, value, from) => {
  const opts = { from: from }
  if (value) opts.value = value
  return ms.propose(candidate, name).sendCommit(opts)
}
const unvote = (candidate, from) => {
  const opts = { from: from }
  return ms.unvote(candidate).sendCommit(opts)
}
const resign = (candidate, from) => {
  const opts = { from: from }
  return ms.resign(candidate).sendCommit(opts)
}
const sendData2Template = async () => {
  const result = await tweb3['callReadonlyContractMethod']('system.election', 'getCandidates', [])
  document.getElementById('candidates').innerHTML = candidateTemplate(formatCandidates(result))
}
const getDefaultAccount = async () => {
  await loadFromStorage()
  return tweb3.wallet.defaultAccount
}
$(document).ready(async function () {
  await sendData2Template()
  const defaultAccount = await getDefaultAccount()

  $('button.vote[data-pubkey]').on('click', function () {
    const pubkey = this.getAttribute('data-pubkey')
    const value = parseInt(window.prompt('Enter an amount of TEA to vote:', 1))
    vote(pubkey, toUNIT(value), defaultAccount)
      .then(() => {
        window.alert('You voted for pubkey: ' + pubkey)
        window.location.reload()
      }, (error) => {
        window.alert(error)
      })
  })
  $('button.submit').on('click', function () {
    const address = $('#address').val()
    const name = $('#name').val()
    const deposit = $('#deposit').val()

    if (address && name && deposit) {
      propose(address, name, toUNIT(deposit), defaultAccount)
        .then(() => {
          window.alert('Your proposal is approved!')
          window.location.reload()
        }, (error) => {
          window.alert(error)
        })
    }
  })
  $('button.unvote').on('click', function () {
    const pubkey = this.getAttribute('data-pubkey')
    unvote(pubkey, defaultAccount)
      .then(() => {
        window.alert('You unvoted for pubkey: ' + pubkey)
        window.location.reload()
      }, (error) => {
        window.alert(error)
      })
  })
  /**
 * `TODO:`
 */
  $('button.resign[data-pubkey]').on('click', function () {
    const pubkey = this.getAttribute('data-pubkey')
    resign(pubkey, defaultAccount)
      .then(() => {
        window.alert('You resigned for pubkey: ' + pubkey)
        window.location.reload()
      }, (error) => {
        window.alert(error)
      })
  })
})
