/* global jest describe test expect beforeAll afterAll */

const { sleep, randomAccountWithBalance } = require('../helper')
const startup = require('../../icetea/abcihandler')
const { ContractMode } = require('icetea-common')
const { IceTeaWeb3 } = require('icetea-web3')
const server = require('abci')
const createTempDir = require('tempy').directory

jest.setTimeout(30000)

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

async function testSimpleStoreCaller (mode, calleeSrc, callerSrc) {
  const { privateKey, address: from } = account10k
  tweb3.wallet.importAccount(privateKey)

  const callee = await tweb3.deploy(mode, calleeSrc, [], { from })
  expect(callee.address).toBeTruthy()

  const caller = await tweb3.deploy(mode, callerSrc, [], { from })
  expect(caller.address).toBeTruthy()

  let r = await caller.methods.getValue(callee.address).call()
  expect(r).toBe(undefined)

  r = await caller.methods.setValue(callee.address, 1).sendCommit({ from })
  expect(r.deliver_tx.code).toBeFalsy()

  r = await caller.methods.getValue(callee.address).call()
  expect(r).toBe(1)
}

describe('SimpleStore', () => {
  test('raw JS simple store caller', async () => {
    const CONTRACT_SRC = `
            const msg = this.runtime.msg;
            switch (msg.name) {
            case 'getValue':
                return this.getState('value');
            case 'setValue':
                return this.setState('value', msg.params[0]);
            }`

    const CALLER_SRC = `
            const { msg, loadContract } = this.runtime;
            const { name, params } = msg;
            const c = loadContract(params[0])
            switch (name) {
            case 'getValue': {
                return c.getValue.invokeView()
            }
            case 'setValue':
                c.setValue.invokeUpdate(params[1]);
            }`

    await testSimpleStoreCaller(ContractMode.JS_RAW, CONTRACT_SRC, CALLER_SRC)
  })
})
