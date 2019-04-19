import tweb3 from './tweb3'
import handlebars from 'handlebars/dist/handlebars.min.js'

const ownersTemplate = handlebars.compile(document.getElementById('ownersTemplate').innerHTML)

function byId (x) {
  return document.getElementById(x)
}
function first (x) {
  return document.querySelector(x)
}
/*
function text (x, t) {
  const e = byId(x)
  e.textContent = t
  return e
}
*/
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

function loadWallet () {
  try {
    const resp = tweb3.wallet.loadFromStorage('123')
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
    val('alias', alias || '')
  })
}

function loadDid (targetAddress) {
  tweb3.contract('system.did').methods.query(targetAddress).call()
    .then(props => {
      if (props) {
        const { owners, threshold/*, attributes */ } = props // eslint-disable-line
        if (threshold) {
          val('threshold', threshold || 1)
        }
        if (owners && Object.keys(owners).length) {
          byId('ownerList').innerHTML = ownersTemplate(owners)
        }
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
      first("option[value='']").remove()
      byId('things').classList.remove('hide')
    } else {
      window.alert('Seems that something went wrong.')
    }
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
        byId('alias').value = r.result
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
        byId('threshold').value = r.result
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

function registerEvents () {
  registerFromEvent()
  registerUpdateAliasEvent()
  registerUpdateThresholdEvent()
  registerAddOwnerEvent()
}

; (function () {
  window.setTimeout(loadWallet, 300)
  registerEvents()
})()
