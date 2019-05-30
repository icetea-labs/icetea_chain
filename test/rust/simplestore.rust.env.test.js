/* global jest describe test expect beforeAll afterAll */

const fs = require('fs')
const { sleep, randomAccountWithBalance } = require('../helper')
const { TxOp, ContractMode } = require('icetea-common')
const startup = require('../../icetea/abcihandler')
const { IceTeaWeb3 } = require('icetea-web3')
const server = require('abci')
const createTempDir = require('tempy').directory

jest.setTimeout(30000)

const contractPath = './example/Rust/SimpleStore.wasm'
let tweb3
let account10k // this key should have 10k of coins before running test suite
let instance
beforeAll(async () => {
  const handler = await startup({ path: createTempDir() })
  instance = server(handler)
  instance.listen(global.ports.abci)
  await sleep(4000)

  tweb3 = new IceTeaWeb3(`http://127.0.0.1:${global.ports.rpc}`)
  account10k = await randomAccountWithBalance(tweb3, 10000)
})

afterAll(() => {
  tweb3.close()
  instance.close()
})

async function testSimpleStore (mode, contractPath) {
  const { privateKey, address: from } = account10k
  tweb3.wallet.importAccount(privateKey)

  const fromBalance = Number((await tweb3.getBalance(from)).balance)
  expect(fromBalance).toBeGreaterThan(1000)

  const value = 2
  const fee = 1
  let src = fs.readFileSync(contractPath, 'base64')

  const data = {
    op: TxOp.DEPLOY_CONTRACT,
    mode,
    src
  }

  const result = await tweb3.sendTransactionCommit({ from: account10k.address, value, fee, data })
  expect(result.deliver_tx.code).toBeFalsy()

  // tags must be correct
  const tags = tweb3.utils.decodeTags(result)
  expect(tags['tx.from']).toBe(from)
  expect(typeof tags['tx.to']).toBe('string')
  const to = tags['tx.to']

  // since value > 0, a system 'Transferred' event must be emitted
  const events = tweb3.utils.decodeEventData(result)
  expect(events.length).toBe(2)
  expect(events[0]).toEqual({
    emitter: 'system',
    eventName: 'Transferred',
    eventData: { from, to, payer: from, value: value.toString() }
  })

  // Verify balance changes after TX

  const newFromBalance = await tweb3.getBalance(from)
  expect(Number(newFromBalance.balance)).toBe(fromBalance - value)

  const newToBalance = await tweb3.getBalance(to)
  expect(Number(newToBalance.balance)).toBe(value)

  // Verify getContracts
  const contracts = await tweb3.getContracts()
  expect(contracts).toContain(to)

  // Verify medatada
  // const meta = await tweb3.getMetadata(to)
  // expect(meta.getOwner.decorators[0]).toEqual('view')
  // expect(meta.getValue.decorators[0]).toEqual('view')
  // expect(meta.setValue.decorators[0]).toEqual('transaction')

  // check owner
  const owner = await tweb3.callReadonlyContractMethod(to, 'get_owner')
  expect(owner).toBe(from)

  const value2Set = 100

  // Set value
  const data2 = {
    op: TxOp.CALL_CONTRACT,
    name: 'set_value',
    params: [value2Set]
  }

  const result2 = await tweb3.sendTransactionCommit({ from: account10k.address, to, data: data2 })
  expect(result2.deliver_tx.code).toBeFalsy()

  // Check ValueChanged event was emit
  const events2 = tweb3.utils.decodeEventData(result2)
  expect(events2.length).toBe(2)
  expect(events2[0]).toEqual({
    emitter: to,
    eventName: 'ValueChanged',
    eventData: { value: value2Set.toString() } // for u128
  })

  // Get the value after check
  const valueCheck = await tweb3.callReadonlyContractMethod(to, 'get_value')
  expect(valueCheck).toBe(value2Set.toString()) // for u128
}

describe('SimpleStore', () => {
  test('rust valid-syntax simple store', async () => {
    await testSimpleStore(ContractMode.WASM, contractPath)
  })
})
