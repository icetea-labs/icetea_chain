const { IceTeaWeb3 } = require('icetea-web3')

const tweb3 = new IceTeaWeb3('ws://localhost:26657/websocket')

async function testSimpleStore (times = 10) {
  const key = '/FyrD4CM92XGLyMbS8PRYWfw8h4EXQ1BGPqC+DDzsJU='

  const to = '717BFqg1QhNtsJiNiWz9jGpsm5iAJKqWQBhhk36KjvUFqNkh48'

  const promises = []
  for (let i = 0; i < times; i++) {
    promises.push(tweb3.sendTransactionCommit({ to }, key))
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
