import tweb3 from './tweb3'
// import { ecc, codec } from '@iceteachain/common'
import { decrypt } from 'eciesjs'

function byId (id) {
  return document.getElementById(id)
}

function doDecrypt (privateKey, cipherText) {
  const plainText = decrypt(
    privateKey.toString('hex'),
    Buffer.from(cipherText, 'base64')
  ).toString()
  try {
    return JSON.parse(plainText)
  } catch (e) {
    console.warn(e)
    return plainText
  }
}

function makeRow (i, u, addr) {
  return `<td>${i + 1}</td><td>${u.name}</td><td class='phone'>${
    u.phone
  }</td><td>${addr}</td>`
}

function getField (id, noThrow) {
  const f = byId(id)
  const v = f.value.trim()
  if (!v) {
    f.focus()
    if (noThrow) {
      return
    }
    throw new Error('Please input ' + id)
  }

  return v
}

function checkKey () {
  window.account = tweb3.wallet.importAccount(getField('key'))
  return window.account
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
  const account = window.account
  if (!account || !account.privateKey) {
    window.alert('Not login yet.')
    return
  } else {
    tweb3.wallet.importAccount(account)
  }

  const rows = byId('userRows')
  rows.innerHTML = ''

  tweb3
    .contract('contract.spacerenter')
    .methods.exportState(['shared', 'users'])
    .sendCommit()
    .then(r => {
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
    })
    .catch(e => {
      console.error(e)
      window.alert(e.message)
    })
})

byId('loginZone').addEventListener('submit', function (e) {
  e.preventDefault()

  try {
    checkKey()
  } catch (e) {
    window.alert(e.message)
    return
  }

  byId('loginZone').classList.add('hide')
  byId('workZone').classList.remove('hide', 'transparent')

  const getData = tweb3
    .contract('contract.spacerenter')
    .methods.exportState(['shared', 'data'])
    .sendCommit()
  Promise.all([getData]).then(([{ returnValue: data }]) => {
    // console.log(data);
    var items = Object.keys(data)
    // set empty
    byId('match').options.length = 0
    for (var i = 0; i < items.length; i++) {
      var key = items[i]
      var element = document.createElement('option')
      element.value = key
      const { host, visitor, deadline } = data[key].info
      element.textContent = `${host} - ${visitor} (${new Date(
        deadline
      ).toDateString()})`
      byId('match').append(element)
    }

    // set default selection
    const today = new Date()
    for (var j = 0; j < items.length; j++) {
      try {
        var opt = items[j]
        var matchDate = opt.slice(-10)
        matchDate = new Date(matchDate)

        if (today.getDate() === matchDate.getDate()) {
          byId('match').value = opt
          break
        } else if (today.getDate() <= matchDate.getDate() + 1) {
          byId('match').value = opt
        }
      } catch (e) {
        console.warn(e)
      }
    }
  })
})

byId('getPlayers').addEventListener('click', function (e) {
  e.preventDefault()

  const account = window.account
  if (!account || !account.privateKey) {
    window.alert('Not login yet.')
    return
  } else {
    tweb3.wallet.importAccount(account)
  }

  const matchId = getField('match', true)
  if (matchId === undefined) {
    window.alert('No match selected.')
    return
  }

  const rows = byId('userRows')
  rows.innerHTML = ''

  const getUsers = tweb3
    .contract('contract.spacerenter')
    .methods.exportState(['shared', 'users'])
    .sendCommit()
  const getPlayers = tweb3
    .contract('contract.spacerenter')
    .methods.exportState(['shared', 'data', matchId, 'players'])
    .sendCommit()

  Promise.all([getUsers, getPlayers])
    .then(([{ returnValue: users }, { returnValue: players }]) => {
      const entries = Object.entries(players)
      if (!players || !entries.length) {
        byId('count').textContent = 'No players'
        return
      }
      byId('count').textContent = players.length
      entries.forEach(([addr, { predict, timestamp }], i) => {
        const u = users[addr]
        decryptUser(u, account)

        const row = document.createElement('TR')
        row.innerHTML = makeRow(i, u, 'Chọn button số ' + (predict + 1)) // new Date(timestamp).toString()
        rows.append(row)
      })
    })
    .catch(e => {
      console.error(e)
      window.alert(e.message)
    })
})

byId('getWinners').addEventListener('click', function (e) {
  e.preventDefault()

  const account = window.account
  if (!account || !account.privateKey) {
    window.alert('Not login yet.')
    return
  } else {
    tweb3.wallet.importAccount(account)
  }

  const matchId = getField('match', true)
  if (matchId === undefined) {
    window.alert('No match selected.')
    return
  }

  const rows = byId('userRows')
  rows.innerHTML = ''

  const getUsers = tweb3
    .contract('contract.spacerenter')
    .methods.exportState(['shared', 'users'])
    .sendCommit()
  const getWinners = tweb3
    .contract('contract.skygarden_seagames')
    .methods.getWinners(matchId)
    .sendCommit()
  // const getWinners = tweb3.contract('teat14feryghwal6krgpaq49ka6ykh742zshk4px9wx').methods.getWinners(matchId).sendCommit()
  Promise.all([getUsers, getWinners])
    .then(([{ returnValue: users }, { returnValue: winners }]) => {
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
    })
    .catch(e => {
      console.error(e)
      window.alert(e.message)
    })
})

byId('copy').addEventListener('click', function (e) {
  e.preventDefault()

  const phones = Array.from(document.querySelectorAll('.phone')).map(
    p => p.textContent
  )
  if (!phones || !phones.length) {
    window.alert('Nothing to copy.')
    return
  }
  navigator.clipboard
    .writeText(phones.join('\n'))
    .then(r => window.alert('Copied ' + phones.length + ' items to clipboard'))
})

byId('export').addEventListener('click', function (e) {
  e.preventDefault()

  const phones = Array.from(document.querySelectorAll('.phone')).map(
    p => p.textContent
  )
  if (!phones || !phones.length) {
    window.alert('Nothing to download.')
    return
  }

  const encodedUri = encodeURI(
    'data:text/plain;charset=utf-8,' + phones.join('\n')
  )
  var link = document.createElement('a')
  link.setAttribute('href', encodedUri)
  link.setAttribute('download', 'bot_phones.txt')
  document.body.appendChild(link)

  link.click()
  window.setTimeout(() => {
    document.body.removeChild(link)
  }, 100)
})
