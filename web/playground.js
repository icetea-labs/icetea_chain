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

function getField (id) {
  const f = byId(id)
  const v = f.value.trim()
  if (!v) {
    f.focus()
    throw new Error('Please input ' + id)
  }

  return v
}

function checkKey () {
  return tweb3.wallet.importAccount(getField('key'))
}

function decryptUser (info, account) {
  if (info._) {
    const plainData = doDecrypt(account.privateKey, info._)
    if (plainData !== null && typeof plainData === 'object') {
      Object.assign(info, plainData)
    } else {
      info.phone = plainData
    }
  }

  return info
}

byId('getUsers').addEventListener('click', function (e) {
  e.preventDefault()

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
        decryptUser(info, account)

        const row = document.createElement('TR')
        row.innerHTML = makeRow(i, info, addr)
        rows.append(row)
      })
    }
  }).catch(e => {
    console.error(e)
    window.alert(e.message)
  })
})

byId('getWinners').addEventListener('click', function (e) {
  e.preventDefault()

  let account, matchId
  try {
    account = checkKey()
    matchId = getField('match')
  } catch (e) {
    window.alert(e.message)
    return
  }

  const rows = byId('userRows')
  rows.innerHTML = ''

  const getUsers = tweb3.contract('contract.spacerenter').methods.exportState(['shared', 'users']).sendCommit()
  const getWinners = tweb3.contract('skygarden_seagames').methods.getWinners(matchId).sendCommit()
  Promise.all([
    getUsers,
    getWinners
  ]).then(([{ returnValue: users }, { returnValue: winners }]) => {
    if (!winners || !winners.length) {
      byId('count').textContent = 'No winners'
      return
    }
    byId('count').textContent = winners.length
    winners.forEach((w, i) => {
      const u = users[w.address]
      decryptUser(u, account)

      const row = document.createElement('TR')
      row.innerHTML = makeRow(i, u, w.top ? 'voucher + beer' : 'beer') // new Date(w.timestamp).toString()
      rows.append(row)
    })
  }).catch(e => {
    console.error(e)
    window.alert(e.message)
  })
})
