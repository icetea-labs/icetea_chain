require('dotenv').config()
const { web3 } = require('./helper')
const tweb3 = web3.default()

async function testSimpleStore (times = 10) {
  const key = process.env.BANK_KEY
  tweb3.wallet.importAccount(key)

  const to = 'tea1al54h8fy75h078syz54z6hke6l9x232zyk25cx'

  const promises = []
  for (let i = 0; i < times; i++) {
    promises.push(tweb3.sendTransactionCommit({ to }))
  }

  console.log('DONE!!!', await Promise.all(promises))
}

async function test (times) {
  try {
    await testSimpleStore(times)
  } catch (error) {
    console.error(error)
  }

  console.log('Time', Date.now() - START)
  tweb3.close()
}

let times = 50
if (process.argv.length > 2) {
  times = parseInt(process.argv[2]) || times
}

console.log(`Create ${times} transactions...`)
const START = Date.now()
test(times)
