const fs = require('fs')
const { sleep, randomAccountWithBalance } = require('../helper')
const startup = require('../../icetea/abcihandler')
const { IceteaWeb3 } = require('icetea-web3')
const server = require('abci')
const createTempDir = require('tempy').directory

jest.setTimeout(30000)

let tweb3
let account10k // this key should have 10k of coins before running test suite
let instance
let contract
beforeAll(async () => {
  const handler = await startup({ path: createTempDir() })
  instance = server(handler)
  instance.listen(global.ports.abci)
  await sleep(4000)

  tweb3 = new IceteaWeb3(`http://127.0.0.1:${global.ports.rpc}`)
  account10k = await randomAccountWithBalance(tweb3, 10000)
})

afterAll(() => {
  tweb3.close()
  instance.close()
})

describe('rust wasm context', () => {
  test('context test', async () => {
    const { privateKey, address: from } = account10k
    tweb3.wallet.importAccount(privateKey)

    const result = await tweb3.deployWasm(fs.readFileSync('./test/rust/assets/context-test.wasm', 'base64'), [], { from })
    expect(result.address).toBeDefined()
    contract = tweb3.contract(result.address)

    const sender = await contract.methods.get_sender().call({ from })
    expect(sender).toBe(from)

    const address = await contract.methods.get_address().call({ from })
    expect(address).toBe(result.address)

    const hash = await contract.methods.get_block_hash().call({ from })
    expect(hash).toBeDefined()

    const blockNumber = await contract.methods.get_block_number().call({ from })
    expect(blockNumber).toBeDefined()

    const now = await contract.methods.now().call({ from })
    expect(now).toBeDefined()

    const value = 1000
    const transfer = await tweb3.sendTransactionCommit({ from, to: result.address, value })
    expect(transfer.deliver_tx.code).toBeFalsy()
    expect(typeof transfer.hash).toBe('string')

    const balance = await contract.methods.get_balance().call({ from })
    expect(balance).toBe(value.toString())

    const refund = await contract.methods.transfer(from, value).sendCommit({ from })
    expect(refund.hash).toBeDefined()

    const afterBalance = await contract.methods.get_balance().call({ from })
    expect(afterBalance).toBe('0')

    const returnValue = await contract.methods.get_msg_value().sendCommit({ from, value })
    expect(returnValue.returnValue).toBe(value.toString())

    const returnFee = await contract.methods.get_msg_fee().sendCommit({ from, fee: value })
    expect(returnFee.returnValue).toBe(value.toString())
  })

  test('state opts', async () => {
    const { address: from } = account10k

    const hasState = await contract.methods.has_state('owner').call({ from })
    expect(hasState).toBe(true)

    const deleteState = await contract.methods.delete_state('owner').sendCommit({ from })
    expect(deleteState.returnValue).toBe(true)

    const oldContract = contract
    const result = await tweb3.deployWasm(fs.readFileSync('./test/rust/assets/context-test.wasm', 'base64'), [oldContract.address], { from })
    contract = tweb3.contract(result.address)

    const otherHasState = await contract.methods.other_has_state('owner').call({ from })
    expect(otherHasState).toBe(false)
  })

  test('pure opts', async () => {
    const { address: from } = account10k

    const sender = await contract.methods.pure_get_sender().callPure({ from })
    expect(sender).toBe(from)
  })
})
