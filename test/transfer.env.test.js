/* global jest describe test expect */

const { IceTeaWeb3 } = require('../tweb3')
const ecc = require('../icetea/helper/ecc')

jest.setTimeout(30000)

let tweb3
beforeAll(() => {
  tweb3 = new IceTeaWeb3('http://localhost:3001/api')
})

afterAll(() => {
  tweb3.close()
});

describe('transfer', () => {
  test('transfer with enough balance', async () => {
    const privateKey = '5K4kMyGz839wEsG7a9xvPNXCmtgFE5He2Q8y9eurEQ4uNgpSRq7'

    const from = ecc.toPublicKey(privateKey)
    const fromBalance = (await tweb3.getBalance(from)).balance
    expect(fromBalance).toBeGreaterThan(1000)

    const to = '7cn9sR51ve3npAFuHqCJHep3Jum7DtrtA2gaBYc9cKHJPp97Er'
    const toBalance = (await tweb3.getBalance(to)).balance
    expect(toBalance).toBeGreaterThanOrEqual(0)

    const value = 100.5
    const fee = 0.1

    const result = await tweb3.sendTransactionCommit({ from, to, value, fee }, privateKey)
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
      eventData: { from, to, value }
    })

    // Verify balance changes after TX

    const newFromBalance = (await tweb3.getBalance(from)).balance
    expect(newFromBalance).toBe(fromBalance - value - fee)

    const newToBalance = (await tweb3.getBalance(to)).balance
    expect(newToBalance).toBe(toBalance + value)
  })

  test('transfer with zero balance', async () => {
    const privateKey = await ecc.generateKey()

    const from = ecc.toPublicKey(privateKey)
    const fromBalance = (await tweb3.getBalance(from)).balance
    expect(fromBalance).toBe(0)

    const to = '7cn9sR51ve3npAFuHqCJHep3Jum7DtrtA2gaBYc9cKHJPp97Er'

    let value
    let fee = 0.000001

    let result = await tweb3.sendTransactionCommit({ from, to, value, fee }, privateKey)
    expect(result.check_tx.code).toBeTruthy()

    value = 0.0001
    fee = undefined

    result = await tweb3.sendTransactionCommit({ from, to, value, fee }, privateKey)
    expect(result.check_tx.code).toBeTruthy()

    value = undefined
    fee = undefined

    result = await tweb3.sendTransactionCommit({ from, to, value, fee }, privateKey)
    expect(result.deliver_tx.code).toBeFalsy()
  })
})
