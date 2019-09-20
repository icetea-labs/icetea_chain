/* global jest describe test expect beforeAll afterAll */

const { randomAccountWithBalance, sleep } = require('../helper')
const startup = require('../../icetea/app/abcihandler')
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

describe('alias', () => {
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
    await expect(register('teat1ahu422tv8sjy3rdakpc7wra89ug9mplaqsffh7')).rejects.toThrowError('permission')
    await expect(register('system.alias')).rejects.toThrowError('Permission')
  })

  test('register alias for account you owns', async () => {
    const { privateKey, address: from } = account10k
    tweb3.wallet.importAccount(privateKey)
    const opt = { from }

    const ms = tweb3.contract('system.alias').methods

    const register = (name, addr, overwrite = false) => {
      return ms.register(name, addr, overwrite).sendCommit(opt)
    }
    await expect(register('a#b', from)).rejects.toThrowError('invalid characters')
    await expect(register('system.hello', from)).rejects.toThrowError('cannot start with')
    await expect(register('account.hello', from)).rejects.toThrowError('cannot start with')
    await expect(register('contract.hello', from)).rejects.toThrowError('cannot start with')
    await register('goodmorning', from)
    const addr = await ms.resolve('account.goodmorning').call()
    expect(addr).toBe(from)

    let list = await ms.query('mor').call()
    expect(list['account.goodmorning'].address).toBe(from)
    expect(list['account.goodmorning'].by).toBe(from)

    list = await ms.query('mor2').call()
    expect(list).toEqual({})

    list = await ms.query(/mor/).call()
    expect(list['account.goodmorning'].address).toBe(from)
    expect(list['account.goodmorning'].by).toBe(from)

    list = await ms.query(/mor\d/).call()
    expect(list).toEqual({})

    list = await ms.byAddress(from).call()
    expect(list).toEqual(['account.goodmorning'])

    await register('hello', from)
    const addr2 = await ms.resolve('account.hello').call()
    expect(addr2).toBe(from)

    list = await ms.byAddress(from).call()
    expect(list).toEqual(['account.goodmorning', 'account.hello'])
  })

  test('re-register alias', async () => {
    const { address: addr1 } = tweb3.wallet.createBankAccount()
    const { address: addr2 } = tweb3.wallet.createBankAccount()

    const ms = tweb3.contract('system.alias').methods
    const register = (name, addr, overwrite = false) => {
      return ms.register(name, addr, overwrite).sendCommit({ from: addr })
    }

    let list = await ms.byAddress(addr1).call()
    expect(list).toEqual([])

    list = await ms.byAddress(addr2).call()
    expect(list).toEqual([])

    await register('abc1', addr1)
    await expect(register('abc1', addr1)).rejects.toThrowError('already registered')
    await register('abc1', addr1, true)

    await expect(register('abc1', addr2)).rejects.toThrowError('already registered')
    await expect(register('abc1', addr2, true)).rejects.toThrowError('permission')

    // now, a case of update successfully
    const did = tweb3.contract('system.did')
    await did.methods.addOwner(addr1, addr2).sendCommit({ from: addr1 })

    list = await ms.byAddress(addr1).call()
    expect(list).toEqual(['account.abc1'])

    list = await ms.byAddress(addr2).call()
    expect(list).toEqual([])

    await expect(register('abc1', addr2)).rejects.toThrowError('already registered')
    await register('abc1', addr2, true)

    list = await ms.byAddress(addr1).call()
    expect(list).toEqual([])

    list = await ms.byAddress(addr2).call()
    expect(list).toEqual(['account.abc1'])
  })

  test('resolve alias misc', async () => {
    const ms = tweb3.contract('system.alias').methods
    const meta = await ms.__metadata().callPure()
    expect(meta.query.decorators).toEqual(['view'])
    expect(meta.resolve.decorators).toEqual(['view'])
    expect(meta.register.decorators).toEqual(['transaction'])
  })
})
