import tweb3 from './tweb3'
import handlebars from 'handlebars/dist/handlebars.min.js'
import { toTEA } from './common'

const ownersTemplate = handlebars.compile(document.getElementById('ownersTemplate').innerHTML)
const inheritorsTemplate = handlebars.compile(document.getElementById('inheritorsTemplate').innerHTML)
const tagsTemplate = handlebars.compile(document.getElementById('tagsTemplate').innerHTML)
const tokensTemplate = handlebars.compile(document.getElementById('tokensTemplate').innerHTML)

function byId (x) {
  return document.getElementById(x)
}
function first (x) {
  return document.querySelector(x)
}
function text (x, t) {
  const e = byId(x)
  e.textContent = t
  return e
}
function textAll (x, t) {
  document.querySelectorAll(x).forEach(function (e) {
    e.textContent = t
  })
}
function val (x, t) {
  const e = byId(x)
  e.value = t
  return e
}

async function loadWallet () {
  try {
    const resp = await tweb3.wallet.loadFromStorage('123')
    if (resp === 0) {
      window.alert('Wallet empty! Please go to Wallet tab to create account.')
      return
    }
    const accounts = tweb3.wallet.accounts
    const select = byId('from')

    accounts.forEach(item => {
      const option = document.createElement('option')
      option.value = item.address
      option.textContent = item.address
      select.appendChild(option)
    })
    // select.value = tweb3.wallet.defaultAccount
  } catch (error) {
    console.log(error)
    window.alert(String(error))
  }
}

// function settingFor () {
//   console.log(byId('radioMe').checked)
//   console.log(byId('settingFor').value)
// }

function loadAlias (targetAddress) {
  tweb3.contract('system.alias').methods.byAddress(targetAddress).call().then(alias => {
    val('alias', (alias && alias.length) ? alias[0] : '')
  })
}

function loadDid (targetAddress) {
  tweb3.contract('system.did').methods.query(targetAddress).call()
    .then(props => {
      if (props) {
        const { owners, threshold, inheritors, tags, tokens } = props // eslint-disable-line
        if (threshold) {
          val('threshold', threshold || 1)
        }
        if (owners && Object.keys(owners).length) {
          byId('ownerList').innerHTML = ownersTemplate(owners)
        } else {
          text('ownerList', '')
        }
        if (inheritors && Object.keys(inheritors).length) {
          byId('inheList').innerHTML = inheritorsTemplate(inheritors)
        } else {
          text('inheList', '')
        }
        if (tags && Object.keys(tags).length) {
          byId('tagList').innerHTML = tagsTemplate(tags)
        } else {
          text('tagList', '')
        }
        if (tokens && Object.keys(tokens).length) {
          // convert expireAfter to date
          Object.values(tokens).forEach(c => {
            Object.values(c).forEach(v => {
              v.expireString = new Date(v.expireAfter).toLocaleString()
            })
          })
          byId('tokenList').innerHTML = tokensTemplate(tokens)
        } else {
          text('tokenList', '')
        }
      } else {
        text('ownerList', '')
        text('inheList', '')
        text('tagList', '')
        text('tokenList', '')
      }
    })
}

function registerFromEvent () {
  const select = byId('from')
  select.addEventListener('change', function () {
    const address = select.value
    textAll('.signinAddress', address)
    if (address) {
      loadAlias(address)
      loadDid(address)
      const nullOpt = first("option[value='']")
      nullOpt && nullOpt.remove()
      byId('things').classList.remove('hide')
    } else {
      window.alert('Seems that something went wrong.')
    }
  })
}

function registerFaucetEvent () {
  const button = byId('btnFaucet')
  button.addEventListener('click', function () {
    const address = byId('from').value
    if (!address) {
      window.alert('Please select "sign-in as" first.')
      return
    }

    tweb3.contract('system.faucet').methods.request(/* address */).sendCommit({ from: address, payer: 'system.faucet' })
      .then(r => {
        window.alert('Success.')
      })
      .catch(error => {
        console.error(error)
        window.alert(String(error))
      })
  })
}

function registerUpdateAliasEvent () {
  const button = byId('updateAlias')
  button.addEventListener('click', function () {
    const address = byId('from').value
    if (!address) {
      window.alert('Please select "sign-in as" first.')
      return
    }

    const alias = byId('alias').value.trim()
    if (!alias) {
      window.alert('Please enter alias.')
      return
    }
    tweb3.contract('system.alias').methods.register(alias, address).sendCommit({ from: address })
      .then(r => {
        byId('alias').value = r.returnValue
        window.alert('Success.')
      })
      .catch(error => {
        console.error(error)
        window.alert(String(error))
      })
  })
}

function registerUpdateThresholdEvent () {
  const button = byId('updateThreshold')
  button.addEventListener('click', function () {
    const address = byId('from').value
    if (!address) {
      window.alert('Please select "sign-in as" first.')
      return
    }

    const threshold = byId('threshold').value.trim()
    if (!threshold) {
      window.alert('Please enter threshold.')
      return
    }
    tweb3.contract('system.did').methods.setThreshold(address, +threshold).sendCommit({ from: address })
      .then(r => {
        byId('threshold').value = r.returnValue
        window.alert('Success.')
      })
      .catch(error => {
        console.error(error)
        window.alert(String(error))
      })
  })
}

function registerAddOwnerEvent () {
  const button = byId('addOwner')
  button.addEventListener('click', function () {
    const address = byId('from').value
    if (!address) {
      window.alert('Please select "sign-in as" first.')
      return
    }

    const owner = byId('newOwner').value.trim()
    if (!owner) {
      window.alert('Please enter owner.')
      return
    }
    const weight = +byId('weight').value.trim() || undefined

    tweb3.contract('system.did').methods.addOwner(address, owner, weight).sendCommit({ from: address })
      .then(r => {
        loadDid(address)
        window.alert('Success.')
      })
      .catch(error => {
        console.error(error)
        window.alert(String(error))
      })
  })
}

function registerRemoveOwnerEvent () {
  const button = byId('ownerList')
  button.addEventListener('click', function (e) {
    e.preventDefault()

    const address = byId('from').value
    if (!address) {
      window.alert('Please select "sign-in as" first.')
      return
    }

    const target = e.target
    if (target.tagName !== 'A') {
      return
    }

    const owner = target.getAttribute('data-owner')

    if (!window.confirm('Sure to delete ' + owner + '?')) {
      return
    }

    tweb3.contract('system.did').methods.removeOwner(address, owner).sendCommit({ from: address })
      .then(r => {
        loadDid(address)
        window.alert('Success.')
      })
      .catch(error => {
        console.error(error)
        window.alert(String(error))
      })
  })
}

function registerAddInheEvent () {
  const button = byId('addInhe')
  button.addEventListener('click', function () {
    const address = byId('from').value
    if (!address) {
      window.alert('Please select "sign-in as" first.')
      return
    }

    const inheritor = byId('newInhe').value.trim()
    if (!inheritor) {
      window.alert('Please enter inheritor.')
      return
    }
    const wait = +byId('waitPeriod').value.trim()
    const lock = +byId('lockPeriod').value.trim()
    if (!wait || !lock) {
      window.alert('Please enter both wait period and lock period.')
      return
    }

    tweb3.contract('system.did').methods.addInheritor(address, inheritor, wait, lock).sendCommit({ from: address })
      .then(r => {
        loadDid(address)
        window.alert('Success.')
      })
      .catch(error => {
        console.error(error)
        window.alert(String(error))
      })
  })
}

function registerRemoveInheEvent () {
  const button = byId('inheList')
  button.addEventListener('click', function (e) {
    e.preventDefault()

    const address = byId('from').value
    if (!address) {
      window.alert('Please select "sign-in as" first.')
      return
    }

    const target = e.target
    if (target.tagName !== 'A') {
      return
    }

    const inheritor = target.getAttribute('data-inheritor')

    if (!window.confirm('Sure to delete ' + inheritor + '?')) {
      return
    }

    tweb3.contract('system.did').methods.removeInheritor(address, inheritor).sendCommit({ from: address })
      .then(r => {
        loadDid(address)
        window.alert('Success.')
      })
      .catch(error => {
        console.error(error)
        window.alert(String(error))
      })
  })
}

function registerAddTagEvent () {
  const button = byId('addTag')
  button.addEventListener('click', function () {
    const address = byId('from').value
    if (!address) {
      window.alert('Please select "sign-in as" first.')
      return
    }

    const name = byId('tagName').value.trim()
    if (!name) {
      window.alert('Please enter tag name.')
      return
    }
    const value = byId('tagValue').value.trim()
    if (!value) {
      window.alert('Please enter tag value.')
      return
    }

    tweb3.contract('system.did').methods.setTag(address, name, value).sendCommit({ from: address })
      .then(r => {
        loadDid(address)
        window.alert('Success.')
      })
      .catch(error => {
        console.error(error)
        window.alert(String(error))
      })
  })
}

function registerRemoveTagEvent () {
  const button = byId('tagList')
  button.addEventListener('click', function (e) {
    e.preventDefault()

    const address = byId('from').value
    if (!address) {
      window.alert('Please select "sign-in as" first.')
      return
    }

    const target = e.target
    if (target.tagName !== 'A') {
      return
    }

    const tag = target.getAttribute('data-tag')

    tweb3.contract('system.did').methods.removeTag(address, tag).sendCommit({ from: address })
      .then(r => {
        loadDid(address)
        window.alert('Success.')
      })
      .catch(error => {
        console.error(error)
        window.alert(String(error))
      })
  })
}

function registerAddTokenEvent () {
  const button = byId('addToken')
  button.addEventListener('click', function () {
    const address = byId('from').value
    if (!address) {
      window.alert('Please select "sign-in as" first.')
      return
    }

    const contract = byId('tokenContract').value.trim()
    if (!contract) {
      window.alert('Please enter token contract address.')
      return
    }

    const tokenAddr = byId('tokenAddr').value.trim()
    if (!tokenAddr) {
      window.alert('Please enter token address.')
      return
    }

    const duration = parseInt(Number(byId('tokenDuration').value.trim()) * 60000) // minute to ms
    if (duration < 1) {
      window.alert('Please enter a duration in minutes.')
      return
    }

    tweb3.contract('system.did').methods.grantAccessToken(address, contract, tokenAddr, duration).sendCommit({ from: address })
      .then(r => {
        loadDid(address)
        window.alert('Success.')
      })
      .catch(error => {
        console.error(error)
        window.alert(String(error))
      })
  })
}

function registerRemoveTokenEvent () {
  const button = byId('tokenList')
  button.addEventListener('click', function (e) {
    e.preventDefault()

    const address = byId('from').value
    if (!address) {
      window.alert('Please select "sign-in as" first.')
      return
    }

    const target = e.target
    if (target.tagName !== 'A') {
      return
    }

    const tokenData = target.getAttribute('data-token')

    if (!window.confirm('Sure to delete ' + tokenData + '?')) {
      return
    }

    const [contract, tokenAddr] = tokenData.split('/')
    tweb3.contract('system.did').methods.revokeAccessToken(address, contract, tokenAddr).sendCommit({ from: address })
      .then(r => {
        loadDid(address)
        window.alert('Success.')
      })
      .catch(error => {
        console.error(error)
        window.alert(String(error))
      })
  })
}

function registerEvents () {
  registerFromEvent()
  registerFaucetEvent()
  registerUpdateAliasEvent()
  registerUpdateThresholdEvent()
  registerAddOwnerEvent()
  registerRemoveOwnerEvent()
  registerAddInheEvent()
  registerRemoveInheEvent()
  registerAddTagEvent()
  registerRemoveTagEvent()
  registerAddTokenEvent()
  registerRemoveTokenEvent()
}

; (function () {
  window.setTimeout(loadWallet, 300)
  registerEvents()
  tweb3.contract('system.faucet').methods.getQuota().callPure()
    .then(n => {
      const tea = toTEA(n)
      text('faucetAmount', tea)
    })
})()
