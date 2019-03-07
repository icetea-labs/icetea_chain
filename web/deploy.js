import $ from 'jquery'
import tweb3 from './tweb3'
window.$ = $

var wasmBuffer = null

// helper.registerTxForm($('#form'), buildData);
$('#form').submit(async function (e) {
  e.preventDefault()
  var mode = +document.getElementById('srcMode').value
  const privateKey = window.$('#private_key').val().trim()
  var src
  if (mode === 100) {
    src = wasmBuffer
    if (!src) {
      window.alert('You must upload a wasm file.')
      return null
    }
  } else {
    src = document.querySelector('#src').value.trim()
    if (!src) {
      window.alert('You must provide contract source.')
      return null
    }
    if (mode === 1 && src.indexOf('@contract') < 0) {
      window.alert("There is no @contract decorator. You should select 'Raw JS' contract source mode.")
      return null
    }
  }

  try {
    var tx = await tweb3.deploy(mode, src, privateKey)
    // console.log('tx',tx);
    window.location.href = '/tx.html?hash=' + tx.hash
  } catch (error) {
    console.log(error)
    window.alert(String(error))
  }
})

document.getElementById('srcMode').addEventListener('change', function (e) {
  var s = this.value
  document.querySelectorAll('[data-modes]').forEach(function (item) {
    item.classList.remove('hide')
    var modes = item.getAttribute('data-modes').split(';')
    if (modes.indexOf(s) < 0) {
      item.classList.add('hide')
    }
  })
})

document.getElementById('wasmFile').addEventListener('change', function (e) {
  if (!this.files || !this.files.length) return
  var file = this.files[0]
  var reader = new window.FileReader()
  reader.readAsDataURL(file)
  reader.onload = function () {
    wasmBuffer = reader.result.split(',')[1]
  }
  reader.onerror = function (error) {
    console.log(error)
    window.alert(String(error))
  }
})
