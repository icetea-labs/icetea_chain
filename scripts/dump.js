const merkle = require('../icetea/helper/merkle')
merkle.load().then(data => {
  console.log(data)
  if (data && data.state) {
    console.log('Recaculated Hash: ', merkle.getHash(data.state).toString('hex').toUpperCase())
  }
}).catch(console.error)
