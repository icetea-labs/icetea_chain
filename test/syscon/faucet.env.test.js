/* global jest describe test expect beforeAll afterAll */

// const { randomAccountWithBalance, sleep } = require('../helper')
const { sleep } = require('../helper')
const startup = require('../../icetea/abcihandler')
const { IceteaWeb3 } = require('@iceteachain/web3')
const server = require('abci')
const createTempDir = require('tempy').directory
// const { ecc } = require('@iceteachain/common')

jest.setTimeout(30000)

let tweb3
// let account10k // this key should have 10k of coins before running test suite
let instance
beforeAll(async () => {
  const handler = await startup({ path: createTempDir() })
  instance = server(handler)
  instance.listen(global.ports.abci)
  await sleep(4000)

  tweb3 = new IceteaWeb3(`http://127.0.0.1:${global.ports.rpc}`)
  // account10k = await randomAccountWithBalance(tweb3, 10000)
})

afterAll(() => {
  tweb3.close()
  instance.close()
})

const REQUEST_QUOTA = 100e6
const REQUEST_QUOTA_S = String(REQUEST_QUOTA)

describe('faucet', () => {
  test('test request', async () => {
    const ms = tweb3.contract('system.faucet').methods
    const meta = await ms.__metadata().callPure()
    expect(meta.getQuota.decorators).toEqual(['pure'])
    expect(meta.request.decorators).toEqual(['transaction'])

    let r = await ms.getQuota().callPure()
    expect(r).toBe(REQUEST_QUOTA_S)

    const { address: addr1 } = tweb3.wallet.createRegularAccount()
    r = await tweb3.getBalance(addr1)
    expect(r.balance).toBe(0)

    const request = from => {
      return ms.request().sendCommit({ from })
    }
    await expect(request(addr1)).rejects.toThrowError('Cannot transfer to regular account')

    const { address: addr2 } = tweb3.wallet.createBankAccount()
    r = await request(addr2)
    expect(r.returnValue).toBe(REQUEST_QUOTA_S)
    expect(r.events.length).toBe(1)
    expect(r.events[0].emitter).toBe('system.faucet')
    expect(r.events[0].eventName).toBe('FaucetTransferred')
    expect(r.events[0].eventData.amount).toBe(REQUEST_QUOTA_S)
    expect(r.events[0].eventData.requester).toBe(addr2)

    r = await tweb3.getBalance(addr2)
    expect(r.balance).toBe(REQUEST_QUOTA_S)

    await expect(request(addr2)).rejects.toThrowError('No more')

    // now addr2 have requested full amount, he/she could not ask the faucet to pay
    const requestPay = () => {
      return ms._agreeToPayFor({ from: addr2, value: 1 }).call()
    }
    await expect(requestPay()).rejects.toThrowError('bigger than remaining')
  })

  test('test payer', async () => {
    const { address: regAddr } = tweb3.wallet.createRegularAccount()
    const { address: bankAddr } = tweb3.wallet.createBankAccount()
    let r = await tweb3.getBalance(regAddr)
    expect(r.balance).toBe(0)
    r = await tweb3.getBalance(bankAddr)
    expect(r.balance).toBe(0)

    const transfer = (amount, from, payer) => {
      return tweb3.transfer(bankAddr, amount, { from, payer })
    }

    await expect(transfer(1, regAddr)).rejects.toThrowError('without specifying a payer')
    await transfer(1, regAddr, 'system.faucet')
    r = await tweb3.getBalance(regAddr)
    expect(r.balance).toBe(0)
    r = await tweb3.getBalance(bankAddr)
    expect(+r.balance).toBe(1)

    await expect(transfer(REQUEST_QUOTA, regAddr, 'system.faucet')).rejects.toThrowError('bigger than remaining quota')
  })
})
