import { ecc } from 'icetea-common'

const newKeyPairWithAddress = ecc.newKeyPairWithAddress
const toPubKeyAndAddress = ecc.toPubKeyAndAddress

document.getElementById('generatePrivateKey').addEventListener('click', function () {
  var keyInfo = newKeyPairWithAddress()
  document.getElementById('generated_private_key').value = keyInfo.privateKey
  document.getElementById('generated_public_key').value = keyInfo.address
})

document.getElementById('seePublicKey').addEventListener('click', function () {
  var privateKey = document.getElementById('your_private_key').value.trim()
  document.getElementById('your_public_key').value = toPubKeyAndAddress(privateKey).address
})
