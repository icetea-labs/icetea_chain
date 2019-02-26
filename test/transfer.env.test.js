const { IceTeaWeb3 } = require('../tweb3')
const ecc = require('../icetea/helper/ecc')
const tweb3 = new IceTeaWeb3('http://localhost:3001/api')

jest.setTimeout(30000)

describe('transfer', () => {
    test('transfer with enough balance', async () => {
        const privateKey = "5K4kMyGz839wEsG7a9xvPNXCmtgFE5He2Q8y9eurEQ4uNgpSRq7"

        const from = ecc.toPublicKey(privateKey)
        const fromBalance = await tweb3.getBalance(from)
        expect(fromBalance.balance).toBeGreaterThan(1000)

        const to = '7cn9sR51ve3npAFuHqCJHep3Jum7DtrtA2gaBYc9cKHJPp97Er'
        const toBalance = await tweb3.getBalance(to)
        expect(toBalance.balance).toBeGreaterThanOrEqual(0)

        const value = 100.5
        const fee = 0.1

        const result = await tweb3.sendTransactionCommit({ from, to, value, fee }, privateKey)
        expect(typeof result.hash).toBe('string')

        const tx = await tweb3.getTransaction(result.hash)

        const tags = tweb3.utils.decodeTags(tx)
        expect(tags['tx.from']).toBe(from)
        expect(tags['tx.to']).toBe(to)

        const tags2 = tweb3.utils.decodeTags(result)
        expect(tags).toEqual(tags2)

        const events = tweb3.utils.decodeEventData(result)
        expect(events.length).toBe(1)
        expect(events[0]).toEqual({
            emitter: 'system',
            eventName: 'Transferred',
            eventData: { from, to , value},
        })

        const newFromBalance = await tweb3.getBalance(from)
        expect(newFromBalance.balance).toBe(fromBalance.balance - value - fee)

        const newToBalance = await tweb3.getBalance(to)
        expect(newToBalance.balance).toBe(toBalance.balance + value)
    })

    test('transfer with zero balance', async () => {
        const privateKey = "5J2bNdn5FuDnD6Sqo46zKkoac8xGxntyXMrD7wWTzsW3ruHtWVh"

        const from = ecc.toPublicKey(privateKey)
        const fromBalance = await tweb3.getBalance(from)
        expect(fromBalance.balance).toBe(0)

        const to = '7cn9sR51ve3npAFuHqCJHep3Jum7DtrtA2gaBYc9cKHJPp97Er'

        let value = undefined
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