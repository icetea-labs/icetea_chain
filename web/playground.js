import tweb3 from './tweb3'
// import { ecc, codec } from '@iceteachain/common'
import { decrypt } from 'eciesjs'

function byId (id) {
  return document.getElementById(id)
}

function doDecrypt (privateKey, cipherText) {
  const plainText = decrypt(privateKey.toString('hex'), Buffer.from(cipherText, 'base64')).toString()
  try {
    return JSON.parse(plainText)
  } catch (e) {
    console.warn(e)
    return plainText
  }
}

function makeRow (i, u, addr) {
  return `<td>${i + 1}</td><td>${u.name}</td><td>${u.phone}</td><td>${addr}</td>`
}

byId('form').addEventListener('submit', function (e) {
  e.preventDefault()

  const key = byId('key').value.trim()

  if (!key) {
    window.alert('input key')
    return
  }

  const account = tweb3.wallet.importAccount(key)
  // console.log(account)

  tweb3.contract('contract.spacerenter').methods.exportState().sendCommit().then(r => {
    const users = r.returnValue && r.returnValue.shared && r.returnValue.shared.users
    const rows = byId('userRows')
    if (users) {
      Object.entries(users).forEach(([addr, info], i) => {
        if (info._) {
          const plainData = doDecrypt(account.privateKey, info._)
          if (plainData !== null && typeof plainData === 'object') {
            Object.assign(info, plainData)
          } else {
            info.phone = plainData
          }
        }

        const row = document.createElement('TR')
        row.innerHTML = makeRow(i, info, addr)
        rows.append(row)
      })
    }
  }).catch(console.error)
})
