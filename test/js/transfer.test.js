/* global jest describe test expect beforeAll afterAll */

const { ecc } = require('@iceteachain/common')
const { sleep, randomAccountWithBalance } = require('../helper')
const { startupWith } = require('../../icetea/app/abcihandler')
const { IceteaWeb3 } = require('@iceteachain/web3')
const server = require('abci')
const createTempDir = require('tempy').directory

jest.setTimeout(30000)

let tweb3
let account10k // this key should have 10k of coins before running test suite
let instance
beforeAll(async () => {
  const handler = await startupWith({ path: createTempDir() })
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
    await sleep(2000)
    const tx = await tweb3.getTransaction(result.hash)

    const events = tweb3.utils.decodeTxEvents(tx)
    expect(events.length).toBe(2)
    const evTx = events.filter(e => e.eventName === 'tx')
    expect(evTx.length).toBe(1)
    expect(evTx[0].eventData.from).toBe(from)
    expect(evTx[0].eventData.to).toBe(to)

    const evData2 = tweb3.utils.decodeTxEvents(result)
    expect(events).toEqual(evData2)

    // since value > 0, a system 'transfer' event must be emitted
    const ev2 = events.filter(e => e.eventName === 'transfer')
    expect(ev2.length).toBe(1)
    expect(ev2[0]).toEqual({
      emitter: 'system',
      eventName: 'transfer',
      eventData: { from, to, payer: from, value }
    })

    // Verify balance changes after TX

    const newFromBalance = Number((await tweb3.getBalance(from)).balance)
    expect(newFromBalance).toBe(fromBalance - value)

    const newToBalance = Number((await tweb3.getBalance(to)).balance)
    expect(newToBalance).toBe(toBalance + value)
  })

  test('transfer with zero balance', async () => {
    const privateKey = await ecc.newBankKeys().privateKey
    const account = tweb3.wallet.importAccount(privateKey)
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
