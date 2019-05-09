/* global jest describe test expect beforeAll afterAll */

const { ecc } = require('icetea-common')
const { web3, randomAccountWithBalance } = require('./helper')

jest.setTimeout(30000)

let tweb3
let account10k // this key should have 10k of coins before running test suite
beforeAll(async () => {
  tweb3 = web3.default()
  account10k = await randomAccountWithBalance(tweb3, 10000).catch(console.error)
})

afterAll(() => {
  tweb3.close()
})

describe('transfer', () => {
  test('transfer with enough balance', async () => {
    const { privateKey, address: from } = account10k
    tweb3.wallet.importAccount(privateKey)

    const fromBalance = Number((await tweb3.getBalance(from)).balance)
    expect(fromBalance).toBeGreaterThan(100)

    const to = ecc.toPubKeyAndAddressBuffer(ecc.generateKey()).address
    const toBalance = (await tweb3.getBalance(to)).balance
    expect(toBalance).toBeGreaterThanOrEqual(0)

    const value = 2
    const fee = 1

    const result = await tweb3.sendTransactionCommit({ from: account10k.address, to, value, fee })
    expect(result.deliver_tx.code).toBeFalsy()
    expect(typeof result.hash).toBe('string')

    const tx = await tweb3.getTransaction(result.hash)

    // tags must be correct
    const tags = tweb3.utils.decodeTags(tx)
    expect(tags['tx.from']).toBe(from)
    expect(tags['tx.to']).toBe(to)

    const tags2 = tweb3.utils.decodeTags(result)
    expect(tags).toEqual(tags2)

    // since value > 0, a system 'Transferred' event must be emitted
    const events = tweb3.utils.decodeEventData(result)
    expect(events.length).toBe(1)
    expect(events[0]).toEqual({
      emitter: 'system',
      eventName: 'Transferred',
      eventData: { from, to, value: value.toString() }
    })

    // Verify balance changes after TX

    const newFromBalance = Number((await tweb3.getBalance(from)).balance)
    expect(newFromBalance).toBe(fromBalance - value - fee)

    const newToBalance = Number((await tweb3.getBalance(to)).balance)
    expect(newToBalance).toBe(toBalance + value)
  })

  test('transfer with zero balance', async () => {
    const privateKey = await ecc.generateKey()
    var account = tweb3.wallet.importAccount(privateKey)
    const from = account.address // ecc.toPublicKey(privateKey)
    const fromBalance = Number((await tweb3.getBalance(from)).balance)
    expect(fromBalance).toBe(0)

    const to = ecc.toPubKeyAndAddressBuffer(ecc.generateKey()).address

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
