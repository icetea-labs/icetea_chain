/* global jest describe test expect beforeAll afterAll */

const fs = require('fs')
const { sleep, randomAccountWithBalance } = require('../helper')
const { startupWith } = require('../../icetea/app/abcihandler')
const { IceteaWeb3 } = require('@iceteachain/web3')
const server = require('abci')
const createTempDir = require('tempy').directory

jest.setTimeout(30000)

const simpleStorePath = './example/Rust/SimpleStore.wasm'
const simpleStoreCallerPath = './example/Rust/SimpleStoreCaller.wasm'
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

async function testSimpleStore () {
  const { privateKey, address: from } = account10k
  tweb3.wallet.importAccount(privateKey)

  const fromBalance = Number((await tweb3.getBalance(from)).balance)
  expect(fromBalance).toBeGreaterThan(1000)

  const value = 2
  const fee = 1
  const simpleStoreSrc = fs.readFileSync(simpleStorePath, 'base64')
  const simpleStoreCallerSrc = fs.readFileSync(simpleStoreCallerPath, 'base64')

  const result = await tweb3.deployWasm(simpleStoreSrc, [], { value, fee, from })
  expect(result.address).toBeDefined()

  // tags must be correct
  await sleep(2000)
  const { events } = await tweb3.getTransaction(result.hash)
  expect(events.length).toBeGreaterThanOrEqual(1)
  const evTx = events.filter(e => e.eventName === 'tx')
  expect(evTx.length).toBe(1)
  expect(evTx[0].eventData.from).toBe(from)
  expect(typeof evTx[0].eventData.to).toBe('string')
  const to = evTx[0].eventData.to

  const callerResult = await tweb3.deployWasm(simpleStoreCallerSrc, [to], { value, fee, from })
  expect(callerResult.address).toBeDefined()
  const callerAddress = callerResult.address

  // Verify getContracts
  const contracts = await tweb3.getContracts()
  expect(contracts).toContain(to)
  expect(contracts).toContain(callerAddress)

  const simpleContract = tweb3.contract(to)
  const callerContract = tweb3.contract(callerAddress)

  // check owner
  const owner = await simpleContract.methods.get_owner().call()
  expect(owner).toBe(from)

  const value2Set = 100
  let tx = await simpleContract.methods.set_value(value2Set).sendCommit({ from })
  // Check ValueChanged event was emit
  expect(tx.events.length).toBeGreaterThanOrEqual(1)
  const evTx2 = tx.events.filter(e => e.eventName === 'ValueChanged')
  expect(evTx2.length).toBe(1)
  expect(evTx2[0]).toEqual({
    emitter: to,
    eventName: 'ValueChanged',
    eventData: { value: value2Set } // for u128
  })

  const callerValue = 200
  tx = await callerContract.methods.set_value(callerValue).sendCommit()

  expect(tx.events.length).toBeGreaterThanOrEqual(1)
  const evTx3 = tx.events.filter(e => e.eventName === 'ValueChanged')
  expect(evTx2.length).toBe(1)
  expect(evTx3[0]).toEqual({
    emitter: to,
    eventName: 'ValueChanged',
    eventData: { value: callerValue } // for u128
  })

  // Get the value after check
  const valueCheck = await simpleContract.methods.get_value().call()
  expect(valueCheck).toBe(callerValue.toString()) // for u128
}

describe('SimpleStoreCaller', () => {
  test('rust valid-syntax simple store caller', async () => {
    await testSimpleStore()
  })
})
