const { IceTeaWeb3 } = require('../tweb3')
const ecc = require('../icetea/helper/ecc')
const tweb3 = new IceTeaWeb3('http://localhost:3001/api')

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

        const tx = ecc.signTxData({
            from,
            to,
            value,
            fee,
            data: {}
        }, privateKey)

        const result = await tweb3.sendTransactionCommit(tx)
        expect(typeof result.hash).toBe('string')

        const newFromBalance = await tweb3.getBalance(from)
        expect(newFromBalance.balance).toBe(fromBalance.balance - value - fee)

        const newToBalance = await tweb3.getBalance(to)
        expect(newToBalance.balance).toBe(toBalance.balance + value)
    })
})