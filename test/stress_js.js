const { IceTeaWeb3 } = require('../tweb3')
const { switchEncoding } = require('../tweb3/utils')
const { TxOp, ContractMode } = require('../icetea/enum')

const tweb3 = new IceTeaWeb3('ws://localhost:26657/websocket')

async function testSimpleStore (mode, src, times = 10) {
  const key = '5K4kMyGz839wEsG7a9xvPNXCmtgFE5He2Q8y9eurEQ4uNgpSRq7'
  const from = '617BFqg1QhNtsJiNiWz9jGpsm5iAJKqWQBhhk36KjvUFqNkh47'

  const data = {
    op: TxOp.DEPLOY_CONTRACT,
    mode,
    src: switchEncoding(src, 'utf8', 'base64')
  }

  const result = await tweb3.sendTransactionCommit({ from, data }, key)
  const tags = tweb3.utils.decodeTags(result)
  const to = tags['tx.to']

  // Set value
  const data2 = {
    op: TxOp.CALL_CONTRACT,
    name: 'setValue',
    params: [100]
  }

  const promises = []
  for (let i = 0; i < times; i++) {
    promises.push(tweb3.sendTransactionCommit({ from, to, data: data2 }, key))
  }

  console.log('DONE!!!', await Promise.all(promises))
}

async function test (times) {
  const CONTRACT_SRC = `
        @contract class SimpleStore  {
            @state #owner = msg.sender
            @state #value
            getOwner() { return this.#owner }
            getValue() { return this.#value }
            @transaction setValue(value) {
                require(this.#owner == msg.sender, 'Only contract owner can set value')
                require(value, 'Invalid value')
                this.#value = value
                this.emitEvent("ValueChanged", {value: this.#value})
            }
        }`

  try {
    await testSimpleStore(ContractMode.JS_DECORATED, CONTRACT_SRC, times)
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
