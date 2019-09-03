import handlebars from 'handlebars/dist/handlebars.min.js'
import tweb3 from './tweb3'
import $ from 'jquery'
import { fmtHex, loadFromStorage } from './helper'
import { toTEA, toUNIT } from './common'

const candidateTemplate = handlebars.compile(document.getElementById('candidateTemplate').innerHTML)
const withdrawalTemplate = handlebars.compile(document.getElementById('withdrawalTemplate').innerHTML)
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
const formatWithdrawals = (withdrawals) => {
  /**
   * `TODO`: `showing what withdrawals can be made`
   */
  const keys = Object.keys(withdrawals)
  return keys.map((value) => {
    return {
      block: value,
      amount: microTEAtoTEA(withdrawals[value])
    }
  })
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
const withdraw = (candidate) => {
  const opts = { from: candidate }
  return ms.withdraw(candidate).sendCommit(opts)
}
const fetchCandidates = async () => {
  const candidates = await tweb3['callReadonlyContractMethod']('system.election', 'getCandidates', [])
  document.getElementById('candidates').innerHTML = candidateTemplate(formatCandidates(candidates))
}
const fetchWithdrawals = async (defaultAccount) => {
  const withdrawals = await tweb3['callReadonlyContractMethod']('system.election', 'getWithdrawalList', [defaultAccount])
  if (!$.isEmptyObject(withdrawals)) {
    const withdrawalsHTML = document.getElementById('withdrawals')
    withdrawalsHTML.innerHTML = withdrawalTemplate(formatWithdrawals(withdrawals))
    console.log($('#withdraw').show())
  }
}
const getDefaultAccount = async () => {
  await loadFromStorage()
  return tweb3.wallet.defaultAccount
}
$(document).ready(async function () {
  await fetchCandidates()
  const defaultAccount = await getDefaultAccount()
  await fetchWithdrawals(defaultAccount)

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
  $('#withdraw').on('click', () => {
    withdraw(defaultAccount)
      .then(() => {
        window.alert('You withdraw successfully')
        window.location.reload()
      }, (error) => {
        window.alert(error)
      })
  })
})
