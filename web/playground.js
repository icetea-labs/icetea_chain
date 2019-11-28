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

function checkKey (e) {
  e.preventDefault()

  const idField = byId('key')
  const key = idField.value.trim()

  if (!key) {
    idField.focus()
    throw new Error('Input key')
  }

  return tweb3.wallet.importAccount(key)
}

byId('getUsers').addEventListener('click', function (e) {
  let account
  try {
    account = checkKey(e)
  } catch (e) {
    window.alert(e.message)
    return
  }

  const rows = byId('userRows')
  rows.innerHTML = ''

  tweb3.contract('contract.spacerenter').methods.exportState(['shared', 'users']).sendCommit().then(r => {
    const users = r.returnValue
    if (users) {
      const entries = Object.entries(users)
      byId('count').textContent = entries.length
      entries.forEach(([addr, info], i) => {
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

byId('getWinners').addEventListener('click', function (e) {

})
