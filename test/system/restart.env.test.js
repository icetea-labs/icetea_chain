const { randomAccountWithBalance, sleep } = require('../helper')
const startup = require('../../icetea/abcihandler')
const { ContractMode } = require('@iceteachain/common')
const { IceteaWeb3 } = require('@iceteachain/web3')
const server = require('abci')
const createTempDir = require('tempy').directory
const _ = require('lodash')
const { transpile } = global

jest.setTimeout(30000)

let tweb3
let account10k // this key should have 10k of coins before running test suite
let instance
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

const src = `
  @contract class Empty {}
`

describe('restart app', () => {
  test('hash ok, app can restart', async () => {
    const { privateKey, address: from } = account10k
    tweb3.wallet.importAccount(privateKey)
    const numOfContracts = 5
    const result = await Promise.all(_.range(numOfContracts).map(async x => {
      return tweb3.deploy(ContractMode.JS_RAW, await transpile(src), [], { from })
    }))
    expect(result.length).toBe(numOfContracts)

    await instance.close()
    instance.listen(global.ports.abci)
    await sleep(4000)

    const result2 = await Promise.all(_.range(numOfContracts).map(async x => {
      return tweb3.deploy(ContractMode.JS_RAW, await transpile(src), [], { from })
    }))
    expect(result2.length).toBe(numOfContracts)
  })
})
