/* global jest describe test expect beforeAll afterAll */

const { randomAccountWithBalance, sleep } = require('../helper')
const startup = require('../../icetea/abcihandler')
const { IceteaWeb3 } = require('@iceteachain/web3')
const server = require('abci')
const createTempDir = require('tempy').directory
// const { ecc } = require('@iceteachain/common')

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

// test cases
// - resolve unregistered alias
// - register alias for account you do not own
// - register alias for account you owns
// - register alias for account you have permission
// - register invalid alias
// - resolve valid alias
// - byAddress address with one alias
// - byAddress address with many alias

describe('did', () => {
  test('resolve unregistered alias', async () => {
    const ms = tweb3.contract('system.alias').methods

    const addr = await ms.resolve('goodmorning').call()
    expect(addr).toBe(undefined)

    const aliases = await ms.query('partOfAlias').call()
    expect(aliases).toEqual({})
  })

  test('register alias for account you do not own', async () => {
    const { privateKey, address: from } = account10k
    tweb3.wallet.importAccount(privateKey)
    const opt = { from }

    const ms = tweb3.contract('system.alias').methods

    const register = addr => {
      return ms.register('goodmorning', addr).sendCommit(opt)
    }
    await expect(register('teat1ahu422tv8sjy3rdakpc7wra89ug9mplaqsffh7')).rejects.toThrowError('neither your own account nor a smart contract you deployed')
    await expect(register('system.alias')).rejects.toThrowError('do not own')
  })
})
