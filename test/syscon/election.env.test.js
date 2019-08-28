/* global jest describe test expect beforeAll afterAll */

const { randomAccountWithBalance, sleep } = require('../helper')
const startup = require('../../icetea/abcihandler')
const { IceteaWeb3 } = require('@iceteachain/web3')
const server = require('abci')
const createTempDir = require('tempy').directory
// const { ecc } = require('@iceteachain/common')

const { election: config } = require('../../icetea/config')

jest.setTimeout(30000)

let tweb3
let richAccount // this key should have 10k of coins before running test suite
let instance
beforeAll(async () => {
  const handler = await startup({ path: createTempDir() })
  instance = server(handler)
  instance.listen(global.ports.abci)
  await sleep(4000)

  tweb3 = new IceteaWeb3(`http://127.0.0.1:${global.ports.rpc}`)
  richAccount = await randomAccountWithBalance(tweb3, 10e10)
})

afterAll(() => {
  tweb3.close()
  instance.close()
})

describe('election', () => {
  test('test propose', async () => {
    process.env.NODE_ENV = 'development'
    process.env.PRINT_STATE_DIFF = '0'
    process.env.FIXED_VALIDATORS = '1'

    const { privateKey, address: from } = richAccount
    tweb3.wallet.importAccount(privateKey)

    const ms = tweb3.contract('system.election').methods

    let r = await ms.getCandidates().call()
    expect(r.length).toBe(1)
    expect(r[0].operator).toBe(process.env.BANK_ADDR)
    expect(r[0].block).toBe(0)
    r = await ms.getValidators().call()
    expect(r.length).toBe(1)
    expect(r[0].operator).toBe(process.env.BANK_ADDR)
    expect(r[0].block).toBe(0)

    const propose = (value, fromAddress) => {
      const opts = { from: fromAddress || from }
      if (value) opts.value = value
      // This should be a ed25519 pubkey, however, we use the from for simple testing
      return ms.propose(opts.from, '' + Date.now() + Math.random()).sendCommit(opts)
    }

    // now propose without a value
    await expect(propose()).rejects.toThrowError()
    await expect(propose(0)).rejects.toThrowError()
    await expect(propose(config.minValidatorDeposit - 1)).rejects.toThrowError('must deposit')

    r = await propose(config.minValidatorDeposit)
    // deposit more
    await propose(1)

    r = await ms.getCandidates().call()
    expect(r.length).toBe(2)
    expect(r[0].pubKey.data).toBe(from)
    expect(r[0].deposit).toBe(String(config.minValidatorDeposit + 1))
    r = await ms.getValidators().call()
    expect(r.length).toBe(2)
    expect(r[0].pubKey.data).toBe(from)
    expect(r[0].deposit).toBe(String(config.minValidatorDeposit + 1))

    const { address: addr2 } = tweb3.wallet.createBankAccount()
    await tweb3.transfer(addr2, config.minValidatorDeposit * 2, { from })

    await propose(config.minValidatorDeposit + config.minVoterValue, addr2)

    r = await ms.getValidators().call()
    expect(r.length).toBe(2)
    expect(r[0].pubKey.data).toBe(addr2)
    expect(r[0].deposit).toBe(String(config.minValidatorDeposit + config.minVoterValue))

    const { address: addr3 } = tweb3.wallet.createBankAccount()
    await tweb3.transfer(addr3, config.minValidatorDeposit * 2, { from })

    await propose(config.minValidatorDeposit + config.minVoterValue + 1, addr3)

    r = await ms.getValidators().call()
    expect(r.length).toBe(2)
    expect(r[0].pubKey.data).toBe(addr3)
    expect(r[0].deposit).toBe(String(config.minValidatorDeposit + config.minVoterValue + 1))

    // now let's test some votes
    const vote = (candidate, value, fromAddress) => {
      const opts = { from: fromAddress || from }
      if (value) opts.value = value
      return ms.vote(candidate).sendCommit(opts)
    }

    await expect(vote(addr2)).rejects.toThrowError()
    await expect(vote(addr2, 0)).rejects.toThrowError()
    await expect(vote(addr2, config.minVoterValue - 1)).rejects.toThrowError('at least')

    await vote(from, config.minVoterValue, addr2)

    r = await ms.getValidators().call()
    expect(r.length).toBe(2)
    expect(r[0].pubKey.data).toBe(from)
    expect(r[0].deposit).toBe(String(config.minValidatorDeposit + 1))
    expect(r[0].capacity).toBe(String(config.minValidatorDeposit + config.minVoterValue + 1))
  })
})
