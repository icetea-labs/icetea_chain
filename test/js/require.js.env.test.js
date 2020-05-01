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

const requireSrc = `
  const _ = require('lodash')

  @contract class Require  {
    @pure isEmpty (value) {
      return _.isEmpty(value)
    }
  }
`

const wrongSrc = `
  const ms = require('ms')
`

describe('require contract', () => {
  test('require contract syntax', async () => {
    const { privateKey, address: from } = account10k
    tweb3.wallet.importAccount(privateKey)

    const fromBalance = Number((await tweb3.getBalance(from)).balance)
    expect(fromBalance).toBeGreaterThan(1000)

    const value = 2
    const fee = 1

    const result = await tweb3.deploy(await transpile(requireSrc), { value, fee, from })
    expect(result.address).toBeDefined()

    const requireContract = tweb3.contract(result.address)
    let isEmpty = await requireContract.methods.isEmpty([]).callPure()
    expect(isEmpty).toBe(true)
    isEmpty = await requireContract.methods.isEmpty([1, 2, 3]).callPure()
    expect(isEmpty).toBe(false)
  })

  test('require non allowed module', async () => {
    const { privateKey, address: from } = account10k
    tweb3.wallet.importAccount(privateKey)

    const fromBalance = Number((await tweb3.getBalance(from)).balance)
    expect(fromBalance).toBeGreaterThan(1000)

    const value = 2
    const fee = 1

    await expect(tweb3.deploy(wrongSrc, { value, fee, from })).rejects.toThrow(Error)
  })
})
