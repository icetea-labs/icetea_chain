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

const deployBot = from => {
  const src = `
        return {
            name: 'Test bot'
        }
    `
  return tweb3.deployJs(src, [], { from }).then(r => r.address)
}

describe('botstore', () => {
  test('resolve unregistered bot', async () => {
    const ms = tweb3.contract('system.botstore').methods
    const meta = await ms.__metadata().callPure()
    expect(meta.query.decorators).toEqual(['view'])
    expect(meta.resolve.decorators).toEqual(['view'])
    expect(meta.register.decorators).toEqual(['transaction'])

    const bot = await ms.resolve('goodmorning').call()
    expect(bot).toBe(null)

    const bots = await ms.query().call()
    expect(Object.keys(bots).length).toBe(1)
    expect(Object.keys(bots)[0]).toBe('system.echo_bot')
  })

  test('register bot', async () => {
    const { privateKey, address: from } = account10k
    tweb3.wallet.importAccount(privateKey)
    const opt = { from }

    const ms = tweb3.contract('system.botstore').methods

    const register = (alias, from, cat = 0, icon = 'test.icon', overwrite = false) => {
      return ms.register(alias, cat, icon, overwrite).sendCommit({ from })
    }
    await expect(register('contract.nonexist', from)).rejects.toThrowError('alias')

    // register bot for account (should be invalid)
    await tweb3.contract('system.alias').methods.register('testaccount', from).sendCommit(opt)
    await expect(register('account.testaccount', from)).rejects.toThrowError('smart contract')

    // register bot for contract
    const botAddr = await deployBot(from)
    await tweb3.contract('system.alias').methods.register('testbot', botAddr).sendCommit(opt)
    const contracts = await tweb3.getContracts(true)
    expect(contracts[0]).toBe('contract.testbot')

    const { address: addr1 } = tweb3.wallet.createBankAccount()
    await expect(register('contract.testbot', addr1)).rejects.toThrowError('Permission')

    await register('contract.testbot', from)

    let bot = await ms.resolve('contract.testbot').call()
    expect(bot.category).toBe(0)
    expect(bot.icon).toBe('test.icon')

    const bots = await ms.query().call()
    expect(Object.keys(bots).length).toBe(2)
    expect(Object.keys(bots)[0]).toBe('system.echo_bot')
    expect(Object.keys(bots)[1]).toBe('contract.testbot')

    // now try to update the bot (update category, icon, etc.)
    await expect(register('contract.testbot', from, 1, 'icon2.icon', false)).rejects.toThrowError('already registered')
    await register('contract.testbot', from, 1, 'icon2.icon', true)
    bot = await ms.resolve('contract.testbot').call()
    expect(bot.category).toBe(1)
    expect(bot.icon).toBe('icon2.icon')
  })
})
