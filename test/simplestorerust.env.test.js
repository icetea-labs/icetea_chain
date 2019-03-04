/* global jest describe test expect beforeAll afterAll */

const fs = require('fs')
const { IceTeaWeb3 } = require('../tweb3')
const { switchEncoding } = require('../tweb3/utils')
const { randomAccountWithBalance } = require('./helper')
const { TxOp, ContractMode } = require('../icetea/enum')

jest.setTimeout(30000)

const contractPath = './example/Rust/SimpleStore.wasm'
let tweb3
let account10k // this key should have 10k of coins before running test suite
beforeAll(async () => {
  tweb3 = new IceTeaWeb3('ws://localhost:26657/websocket')
  account10k = await randomAccountWithBalance(tweb3, 10000)
})

afterAll(() => {
  tweb3.close()
})

async function testSimpleStore (mode, contractPath) {
  const { key, address: from } = account10k

  const fromBalance = (await tweb3.getBalance(from)).balance
  expect(fromBalance).toBeGreaterThan(1000)

  const value = 1.5
  const fee = 0.1
  let src = fs.readFileSync(contractPath)
  src = src.toString('base64')

  const data = {
    op: TxOp.DEPLOY_CONTRACT,
    mode,
    src
  }

  const result = await tweb3.sendTransactionCommit({ from, value, fee, data }, key)
  expect(result.deliver_tx.code).toBeFalsy()

  // tags must be correct
  const tags = tweb3.utils.decodeTags(result)
  expect(tags['tx.from']).toBe(from)
  expect(typeof tags['tx.to']).toBe('string')
  const to = tags['tx.to']

  // since value > 0, a system 'Transferred' event must be emitted
  const events = tweb3.utils.decodeEventData(result)
  expect(events.length).toBe(1)
  expect(events[0]).toEqual({
    emitter: 'system',
    eventName: 'Transferred',
    eventData: { from, to, value }
  })

  // Verify balance changes after TX

  const newFromBalance = await tweb3.getBalance(from)
  expect(newFromBalance.balance).toBe(fromBalance - value - fee)

  const newToBalance = await tweb3.getBalance(to)
  expect(newToBalance.balance).toBe(value)

  // Verify getContracts
  const contracts = await tweb3.getContracts()
  expect(contracts).toContain(to)

  // Verify medatada
  // const meta = await tweb3.getMetadata(to)
  // expect(meta.getOwner.decorators[0]).toEqual('view')
  // expect(meta.getValue.decorators[0]).toEqual('view')
  // expect(meta.setValue.decorators[0]).toEqual('transaction')

  // check owner
  const owner = (await tweb3.callReadonlyContractMethod(to, 'get_owner')).data
  expect(owner).toBe(from)

  const value2Set = 100

  // Set value
  const data2 = {
    op: TxOp.CALL_CONTRACT,
    name: 'set_value',
    params: [value2Set]
  }

  const result2 = await tweb3.sendTransactionCommit({ from, to, data: data2 }, key)
  expect(result2.deliver_tx.code).toBeFalsy()

  // Check ValueChanged event was emit
  const events2 = tweb3.utils.decodeEventData(result2)
  expect(events2.length).toBe(1)
  expect(events2[0]).toEqual({
    emitter: to,
    eventName: 'ValueChanged',
    eventData: { value: value2Set }
  })

  // Get the value after check
  const valueCheck = (await tweb3.callReadonlyContractMethod(to, 'get_value')).data
  expect(valueCheck).toBe(value2Set)
}

describe('SimpleStore', () => {
  test('rust valid-syntax simple store', async () => {
    await testSimpleStore(ContractMode.WASM, contractPath)
  })
})
