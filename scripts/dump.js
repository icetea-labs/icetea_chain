const merkle = require('../icetea/helper/patricia')
merkle.load().then(async data => {
  console.log(data)
  let originHash, calcHash
  if (data && data.block && data.block.stateRoot) {
    originHash = data.block.stateRoot
    console.log('Stored Hash: ', originHash)
  }
  if (data && data.state) {
    calcHash = await merkle.getHash(data.state)
    console.log('Recaculated Hash: ', calcHash)
    if (originHash.toString('base64') === calcHash.toString('base64')) {
      console.log('HASH MATCHES')
    } else {
      console.log('HASH DOES NOT MATCH')
    }
  }
}).catch(console.error)
