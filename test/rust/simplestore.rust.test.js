/* global jest describe test expect beforeAll afterAll */

const fs = require('fs')
const { sleep, randomAccountWithBalance } = require('../helper')
const { TxOp, ContractMode } = require('@iceteachain/common')
const { startupWith } = require('../../icetea/app/abcihandler')
const { IceteaWeb3 } = require('@iceteachain/web3')
const server = require('abci')
const createTempDir = require('tempy').directory

jest.setTimeout(30000)

const contractPath = './example/Rust/SimpleStore.wasm'
let tweb3
let account10k // this key should have 10k of coins before running test suite
let instance
beforeAll(async () => {
  const handler = await startupWith({ path: createTempDir() })
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

async function testSimpleStore (mode, contractPath) {
  const { privateKey, address: from } = account10k
  tweb3.wallet.importAccount(privateKey)

  const fromBalance = Number((await tweb3.getBalance(from)).balance)
  expect(fromBalance).toBeGreaterThan(1000)

  const value = 2
  const fee = 1
  const src = fs.readFileSync(contractPath, 'base64')

  const data = {
    op: TxOp.DEPLOY_CONTRACT,
    mode,
    src
  }

  const result = await tweb3.sendTransactionCommit({ from: account10k.address, value, fee, data })
  expect(result.deliver_tx.code).toBeFalsy()

  const events = tweb3.utils.decodeTxEvents(result)
  expect(events.length).toBe(2)
  const evTx = events.filter(e => e.eventName === 'tx')
  expect(evTx.length).toBe(1)
  expect(evTx[0].eventData.from).toBe(from)
  expect(typeof evTx[0].eventData.to).toBe('string')
  const to = evTx[0].eventData.to

  // since value > 0, a system 'transfer' event must be emitted
  const ev = events.filter(e => e.eventName === 'transfer')
  expect(ev.length).toBe(1)
  expect(ev[0]).toEqual({
    emitter: 'system',
    eventName: 'transfer',
    eventData: { from, to, payer: from, value }
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
  const events2 = tweb3.utils.decodeTxEvents(result2)
  const ev2 = events2.filter(e => e.eventName === 'ValueChanged')
  expect(ev2.length).toBe(1)
  expect(events2[0]).toEqual({
    emitter: to,
    eventName: 'ValueChanged',
    eventData: { value: value2Set } // for u128
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
