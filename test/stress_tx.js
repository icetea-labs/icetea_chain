const { web3 } = require('./helper')

const tweb3 = web3.default()

async function testSimpleStore (times = 10) {
  const key = 'CJUPdD38vwc2wMC3hDsySB7YQ6AFLGuU6QYQYaiSeBsK'
  tweb3.wallet.importAccount(key)

  const to = 'tea_Ngw22YNUDuxi7Q9fHCDSUGnuosR'

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
