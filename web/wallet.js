import $ from 'jquery'
import { codec, ecc, AccountType } from '@iceteachain/common'
import tweb3 from './tweb3'
import { loadFromStorage } from './helper'
// import { functionTypeAnnotation } from '@babel/types'
import { validateMnemonic, mnemonicToSeedSync } from 'bip39'
import { fromMasterSeed } from 'hdkey'

const newKeyPairWithAddress = ecc.newKeys
const toPubKeyAndAddress = ecc.toPubKeyAndAddress

const handleError = function (error) {
  console.error(error)
  window.alert(String(error))
}

document.getElementById('generateRegularKey').addEventListener('click', function () {
  generateKeys(AccountType.REGULAR_ACCOUNT)
})

document.getElementById('generateBankKey').addEventListener('click', function () {
  generateKeys(AccountType.BANK_ACCOUNT)
})

async function generateKeys (type) {
  var keyInfo = newKeyPairWithAddress(type)
  document.getElementById('generated_private_key').textContent = keyInfo.privateKey
  document.getElementById('generated_public_key').textContent = keyInfo.publicKey
  document.getElementById('generated_address').textContent = keyInfo.address
  if (document.getElementById('autoAdd').checked) {
    tweb3.wallet.importAccount(keyInfo.privateKey)
    tweb3.wallet.defaultAccount = keyInfo.address
    await tweb3.wallet.saveToStorage('123')
    showMessage('Success! New account set as default.')
    fillWallet()
  }

  if (type === AccountType.BANK_ACCOUNT && document.getElementById('autoFaucet').checked) {
    tweb3.contract('system.faucet').methods.request(/* address */).sendCommit({ from: keyInfo.address, payer: 'system.faucet' })
      .catch(handleError)
  }
}

document.getElementById('seePublicKey').addEventListener('click', function () {
  var privateKey = document.getElementById('your_private_key').value.trim()
  const data = toPubKeyAndAddress(privateKey)
  $('#your_public_key').text(data.publicKey)
  $('#your_address').text(data.address)
})

document.getElementById('clear').addEventListener('click', function () {
  window.localStorage.removeItem('_icetea_accounts')
  window.location.reload()
})

function fillWallet () {
  var wallets = tweb3.wallet.accounts
  var d = tweb3.wallet.defaultAccount
  console.log(tweb3.wallet)
  $('#currentDefaultAcc').text(d)
  var select = document.getElementById('wallet')
  $('#wallet').empty()
  wallets.forEach(item => {
    const option = document.createElement('option')
    option.value = item.address
    if (d === item.address) {
      option.selected = true
    }
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

function toPkey (mnemonic, type) {
  console.log(mnemonic, type)
  if (!validateMnemonic(mnemonic)) {
    throw new Error('Wrong seed format. Seed must be 12 words.')
  }

  const seed = mnemonicToSeedSync(mnemonic)
  const hdkey = fromMasterSeed(seed).derive('m’/44’/349’/0’/0')

  let pkey, found
  for (let i = 0; !found; i++) {
    if (i > 100) {
      // there must be something wrong, because the ratio of regular account is 50%
      throw new Error('Too many tries deriving regular account from seed.')
    }
    pkey = hdkey.deriveChild(i).privateKey
    const { address } = ecc.toPubKeyAndAddress(pkey)
    found = codec.isAddressType(address, type)
  }

  return pkey
}

$(document).ready(async function () {
  await loadFromStorage()
  fillWallet()
  $('#setDefaultAcc').on('click', async () => {
    try {
      var contract = document.getElementById('wallet').value
      tweb3.wallet.defaultAccount = contract
      $('#currentDefaultAcc').text(tweb3.wallet.defaultAccount)
      await tweb3.wallet.saveToStorage('123')
      showMessage('Success')
    } catch (error) {
      handleError(error)
    }
  })

  $('#showDetailsAcc').on('click', () => {
    try {
      var contract = document.getElementById('wallet').value
      var account = tweb3.wallet.getAccountByAddress(contract)
      window.alert(codec.toKeyString(account.privateKey))
    } catch (error) {
      handleError(error)
    }
  })

  // $('#saveStorage').on('click', async () => {
  //   // showMessage('Saving...')
  //   await tweb3.wallet.saveToStorage('123')
  //   showMessage('Success', 2000)
  // })

  $('#importAccount').on('click', async () => {
    try {
      var privateKey = $('#your_private_key_account').val()
      var account = tweb3.wallet.importAccount(privateKey)
      tweb3.wallet.defaultAccount = account.address
      await tweb3.wallet.saveToStorage('123')
      showMessage('Success! Imported account set as default.')
      fillWallet()
    } catch (error) {
      handleError(error)
    }
  })

  $('[data-import-seed-type]').on('click', async (event) => {
    try {
      var mnemonic = $('#seed_phrases').val()
      var privateKey = toPkey(mnemonic, $(event.target).attr('data-import-seed-type'))
      var account = tweb3.wallet.importAccount(privateKey)
      tweb3.wallet.defaultAccount = account.address
      await tweb3.wallet.saveToStorage('123')
      showMessage('Success! Imported account set as default.')

      fillWallet()
    } catch (error) {
      handleError(error)
    }
  })
})
