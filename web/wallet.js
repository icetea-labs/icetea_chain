import $ from 'jquery'
import { ecc } from 'icetea-common'
import tweb3 from './tweb3'
// import { functionTypeAnnotation } from '@babel/types'

const newKeyPairWithAddress = ecc.newKeyPairWithAddress
const toPubKeyAndAddress = ecc.toPubKeyAndAddress

document.getElementById('generatePrivateKey').addEventListener('click', function () {
  var keyInfo = newKeyPairWithAddress()
  document.getElementById('generated_private_key').value = keyInfo.privateKey
  document.getElementById('generated_public_key').value = keyInfo.address
  tweb3.wallet.importAccount(keyInfo.privateKey)
  fillWallet()
})

document.getElementById('seePublicKey').addEventListener('click', function () {
  var privateKey = document.getElementById('your_private_key').value.trim()
  document.getElementById('your_public_key').value = toPubKeyAndAddress(privateKey).address
})

function fillWallet () {
  var wallets = tweb3.wallet.accounts
  var select = document.getElementById('wallet')
  $('#wallet').empty()
  wallets.forEach(item => {
    let option = document.createElement('option')
    option.value = item.address
    option.textContent = item.address
    select.appendChild(option)
  })
}

$(document).ready(function () {
  fillWallet()
  $('#setDefaultAcc').on('click', () => {
    var contract = document.getElementById('wallet').value
    tweb3.wallet.defaultAccount = contract
  })
})
