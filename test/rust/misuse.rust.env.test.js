const fs = require('fs')
const { sleep, randomAccountWithBalance } = require('../helper')
const startup = require('../../icetea/abcihandler')
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
  await sleep(3000)

  tweb3 = new IceTeaWeb3(`http://127.0.0.1:${global.ports.rpc}`)
  account10k = await randomAccountWithBalance(tweb3, 10000)
})

afterAll(() => {
  tweb3.close()
  instance.close()
})

describe('rust wasm misuse', () => {
  test('import table name problem', async () => {
    const { privateKey, address: from } = account10k
    tweb3.wallet.importAccount(privateKey)

    // import name conflict
    try {
      await tweb3.deployWasm(fs.readFileSync('./test/rust/assets/two-import-name.wasm', 'base64'), [], { from })
    } catch (err) {
      expect(err).not.toBe(null)
    }

    // no main function found
    try {
      await tweb3.deployWasm(fs.readFileSync('./test/rust/assets/no-main.wasm', 'base64'), [], { from })
    } catch (err) {
      expect(err).not.toBe(null)
    }
  })
})