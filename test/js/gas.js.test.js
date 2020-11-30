/* global jest describe test expect beforeAll afterAll */

const { randomAccountWithBalance, sleep } = require('../helper')
const { startupWith } = require('../../icetea/app/abcihandler')
const { IceteaWeb3 } = require('@iceteachain/web3')
const server = require('abci')
const createTempDir = require('tempy').directory
const { transpile } = global

jest.setTimeout(30000)

let tweb3
let account10k // this key should have 10k of coins before running test suite
let instance
beforeAll(async () => {
  const handler = await startupWith({ path: createTempDir(), freeGasLimit: 0 })
  instance = server(handler)
  instance.listen(global.ports.abci)
  await sleep(4000)

  tweb3 = new IceteaWeb3(`http://127.0.0.1:${global.ports.rpc}`)
  account10k = await randomAccountWithBalance(tweb3, 1e10)
})

afterAll(() => {
  tweb3.close()
  instance.close()
})

const src = `const { expect } = require(';')
  @contract class SimpleStore  {
    @state owner = msg.sender
    @state value
    getOwner() { return this.owner.value() }
    getValue() { return this.value.value() }
    @transaction setValue(value) {
      expect(this.owner.value() == msg.sender, 'Only contract owner can set value')
      expect(value, 'Invalid value')
      this.value.value(value)
      this.emitEvent("ValueChanged", {value: this.value.value()})
    }
  }
`

describe('simple store contract', () => {
  test('no free gas limit', async () => {
    const { privateKey, address: from } = account10k
    tweb3.wallet.importAccount(privateKey)
    const originBalance = Number((await tweb3.getBalance(from)).balance)

    const transpiledSrc = await transpile(src)

    // deploy without fee
    await expect(tweb3.deploy(transpiledSrc, { from })).rejects.toThrow(Error)

    // deploy with fee
    const fee = 30000
    const result = await tweb3.deploy(transpiledSrc, { from, fee })
    expect(result.address).toBeDefined()
    const simplestoreContract = tweb3.contract(result.address)

    const fromBalance = Number((await tweb3.getBalance(from)).balance)
    // have refund unused gas
    expect(fromBalance).toBeLessThan(originBalance)
    expect(fromBalance).toBeGreaterThan(originBalance - fee)

    // call without fee
    await expect(simplestoreContract.methods.setValue(1000).sendCommit({ from })).rejects.toThrow(Error)

    // call with fee
    const setValueResult = await simplestoreContract.methods.setValue(1000).sendCommit({ fee, from })
    expect(setValueResult.hash).toBeDefined()
  })

  test('loop many times', async () => {
    const loopSrc = `
      @contract class Loop  {
        @pure loopFunc() {
          let times = 0
          for(let i = 0; i < 1e10; i++) {
            times += 1
          }
        }
      }
    `

    const { privateKey, address: from } = account10k
    tweb3.wallet.importAccount(privateKey)
    const fee = 20000

    const result = await tweb3.deploy(await transpile(loopSrc), { from, fee })
    expect(result.address).toBeDefined()
    const loopContract = tweb3.contract(result.address)

    await expect(loopContract.methods.loopFunc().callPure()).rejects.toThrow(Error)
  })

  test('endless recursion', async () => {
    const endlessSrc = `
      @contract class Endless {
        @pure endlessFunc() {
          this.endlessFunc()
        }
      }
    `

    const { privateKey, address: from } = account10k
    tweb3.wallet.importAccount(privateKey)
    const fee = 20000

    const result = await tweb3.deploy(await transpile(endlessSrc), { from, fee })
    expect(result.address).toBeDefined()
    const endlessContract = tweb3.contract(result.address)

    await expect(endlessContract.methods.endlessFunc().callPure()).rejects.toThrow(Error)
  })
})
