import $ from 'jquery'
import { ecc, codec } from 'icetea-common'
import tweb3 from './tweb3'
// import { functionTypeAnnotation } from '@babel/types'
import bip39 from 'bip39'
import HDKey from 'hdkey'

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
  $('#currentDefaultAcc').text(tweb3.wallet.defaultAccount)
  var select = document.getElementById('wallet')
  $('#wallet').empty()
  wallets.forEach(item => {
    let option = document.createElement('option')
    option.value = item.address
    option.textContent = item.address
    select.appendChild(option)
  })
}
function showMessage (text, time = 4000) {
  // parse message to show
  document.getElementById('info').textContent = text
  setTimeout(() => {
    document.getElementById('info').textContent = ''
  }, time)
}

$(document).ready(function () {
  tweb3.wallet.loadFromStorage('123')
  fillWallet()
  $('#setDefaultAcc').on('click', () => {
    try {
      var contract = document.getElementById('wallet').value
      tweb3.wallet.defaultAccount = contract
      $('#currentDefaultAcc').text(tweb3.wallet.defaultAccount)
      tweb3.wallet.saveToStorage('123')
      showMessage('Success', 2000)
    } catch (error) {
      console.log(error)
      window.alert(String(error))
    }
  })

  $('#saveStorage').on('click', async () => {
    // showMessage('Saving...')
    tweb3.wallet.saveToStorage('123')
    showMessage('Success', 2000)
  })

  $('#importAccount').on('click', async () => {
    try {
      var privateKey = $('#your_private_key_account').val()
      var account = tweb3.wallet.importAccount(privateKey)
      window.alert('Import sucess!\nYour address: ' + account.address)
      fillWallet()
    } catch (error) {
      console.log(error)
      window.alert(String(error))
    }
  })

  $('#generateMnemonic').on('click', async () => {
    try {
      var mnemonic = bip39.generateMnemonic()
      $('#generated_seed_word').val(mnemonic)
      // var seed = bip39.mnemonicToSeedHex(mnemonic)
      var seed = bip39.mnemonicToSeed(mnemonic)
      var hdkey = HDKey.fromMasterSeed(seed)
      // console.log(hdkey.privateKey)
      var account = tweb3.wallet.importAccount(hdkey.privateKey)
      $('#generated_private_key_seed').val(codec.toString(account.privateKey, 'base58'))
      $('#generated_public_key_seed').val(account.address)
      fillWallet()
    } catch (error) {
      console.log(error)
      window.alert(String(error))
    }
  })
})
