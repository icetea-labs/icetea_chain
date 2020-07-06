/* global jest describe test expect beforeAll afterAll */

const { sleep, randomAccountWithBalance } = require('../helper')
const { startupWith } = require('../../icetea/app/abcihandler')
const { ecc } = require('@iceteachain/common')
const { IceteaWeb3 } = require('@iceteachain/web3')
const server = require('abci')
const createTempDir = require('tempy').directory
const { transpile } = global

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

async function compile (src, from, value) {
  return tweb3.deploy({ data: await transpile(src) }, { from, value })
}

describe('transfer from contract', () => {
  test('transfer from contract', async () => {
    const { privateKey, address: from } = account10k
    tweb3.wallet.importAccount(privateKey)
    const value = 200n

    const SEND_CONTRACT = `@contract class Sender  {
            @transaction sendTo(dest: address, amount: bigint | string) {
                this.transfer(dest, BigInt(amount))
            }
        }`

    const R1_CONTRACT = `@contract class R1  {
        constructor () {
            console.log('I am R1')
        }
    }`

    const R2_CONTRACT = `@contract class R2  {
        @onreceive Received () {
        }
    }`

    const R3_CONTRACT = `@contract class R1  {
        @payable @onreceive Received () {
            console.log('R3 got ' + msg.value)
        }
    }`

    const [s1, r1, r2, r3] = await Promise.all([
      compile(SEND_CONTRACT, from, value),
      compile(R1_CONTRACT, from),
      compile(R2_CONTRACT, from),
      compile(R3_CONTRACT, from)
    ])

    const events = tweb3.utils.decodeTxEvents(s1.deployTxResult)
    expect(events.length).toBe(2)
    const evTx = events.filter(e => e.eventName === 'transfer')
    expect(evTx.length).toBe(1)
    expect(evTx[0].eventData.from).toBe(from)
    expect(typeof evTx[0].eventData.to).toBe('string')
    const to = evTx[0].eventData.to

    expect(to).toBe(s1.address)
    expect((await s1.getBalance()).balance).toBe(value)

    const sendTo = (addr, value) => {
      return s1.prepareMethod('sendTo', addr, String(value)).sendCommit()
    }

    // transfer from contract to regular account
    const regularAddr = ecc.newKeyBuffers().address
    await expect(sendTo(regularAddr, 1)).rejects.toThrowError('regular account')

    // transafer from contract to bank account
    const bankAddr = ecc.newBankKeyBuffers().address
    await sendTo(bankAddr, 1)
    expect((await s1.getBalance()).balance).toBe(value - 1n)
    expect((await tweb3.getBalance(bankAddr)).balance).toBe(1n)

    // transfer from contract to contract without @onreceive
    await sendTo(r1.address, 1)
    expect((await s1.getBalance()).balance).toBe(value - 2n)
    expect((await r1.getBalance()).balance).toBe(1n)

    // transfer from contract to contract without payable onreceive
    await expect(sendTo(r2.address, 1)).rejects.toThrowError('@payable')

    // transfer from contract to contract with payable onreceive
    await sendTo(r3.address, 1)
    expect((await s1.getBalance()).balance).toBe(value - 3n)
    expect((await r3.getBalance()).balance).toBe(1n)
  })
})
