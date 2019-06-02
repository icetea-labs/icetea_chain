/* global jest describe test expect beforeAll afterAll */

const { ecc } = require('icetea-common')
const { sleep, randomAccountWithBalance } = require('./helper')
const startup = require('../icetea/abcihandler')
const { IceteaWeb3 } = require('icetea-web3')
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

  tweb3 = new IceteaWeb3(`http://127.0.0.1:${global.ports.rpc}`)
  account10k = await randomAccountWithBalance(tweb3, 10000)
})

afterAll(() => {
  tweb3.close()
  instance.close()
})

describe('transfer', () => {
  test('transfer with enough balance', async () => {
    const { privateKey, address: from } = account10k
    tweb3.wallet.importAccount(privateKey)

    const fromBalance = Number((await tweb3.getBalance(from)).balance)
    expect(fromBalance).toBeGreaterThan(100)

    const to = ecc.newBankKeyBuffers().address
    const toBalance = (await tweb3.getBalance(to)).balance
    expect(toBalance).toBeGreaterThanOrEqual(0)

    const value = 2
    const fee = 1

    const result = await tweb3.sendTransactionCommit({ from: account10k.address, to, value, fee })
    expect(result.deliver_tx.code).toBeFalsy()
    expect(typeof result.hash).toBe('string')

    const tx = await tweb3.getTransaction(result.hash)

    // tags must be correct
    const tags = tweb3.utils.decodeTxTags(tx)
    expect(tags['tx.from']).toBe(from)
    expect(tags['tx.to']).toBe(to)

    const tags2 = tweb3.utils.decodeTxTags(result)
    expect(tags).toEqual(tags2)

    // since value > 0, a system 'Transferred' event must be emitted
    const events = tweb3.utils.decodeTxEvents(result)
    expect(events.length).toBe(1)
    expect(events[0]).toEqual({
      emitter: 'system',
      eventName: 'Transferred',
      eventData: { from, to, payer: from, value: value.toString() }
    })

    // Verify balance changes after TX

    const newFromBalance = Number((await tweb3.getBalance(from)).balance)
    expect(newFromBalance).toBe(fromBalance - value)

    const newToBalance = Number((await tweb3.getBalance(to)).balance)
    expect(newToBalance).toBe(toBalance + value)
  })

  test('transfer with zero balance', async () => {
    const privateKey = await ecc.newBankKeys().privateKey
    var account = tweb3.wallet.importAccount(privateKey)
    const from = account.address // ecc.toPublicKey(privateKey)
    const fromBalance = Number((await tweb3.getBalance(from)).balance)
    expect(fromBalance).toBe(0)

    const to = ecc.newBankKeyBuffers().address

    let value
    let fee = 1

    const transfer = () => {
      return tweb3.sendTransactionCommit({ from: from, to, value, fee })
    }

    await expect(transfer()).rejects.toThrowError('balance')

    value = 1
    fee = undefined
    await expect(transfer()).rejects.toThrowError('balance')

    value = undefined
    fee = undefined

    const result = await tweb3.sendTransactionCommit({ from: from, to, value, fee })
    expect(result.deliver_tx.code).toBeFalsy()
  })
})
