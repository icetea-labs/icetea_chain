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

describe('echobot', () => {
  test('test echobot', async () => {
    const ms = tweb3.contract('system.echo_bot').methods
    const meta = await ms.__metadata().callPure()
    expect(meta.botInfo.decorators).toEqual(['pure'])
    expect(meta.oncommand.decorators).toEqual(['pure'])
    expect(meta.ontext.decorators).toEqual(['pure'])

    let r = await ms.botInfo().callPure()
    expect(r.stateAccess).toBe('none')
    expect(r.name).toBe('Echo bot')
    expect(r.description).toBeTruthy()

    r = await ms.oncommand('start').callPure()
    expect(r).toEqual([
      { type: 'text', content: 'Start' },
      { type: 'input', content: { placeholder: 'Say something' } }
    ])

    r = await ms.ontext('hello').callPure()
    expect(r).toEqual([
      { type: 'text', content: 'hello' },
      { type: 'input', content: { placeholder: 'Say something' } }
    ])
  })
})
