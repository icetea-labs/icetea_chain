/* global jest describe test expect beforeAll afterAll */

const { sleep, randomAccountWithBalance } = require('../helper')
const startup = require('../../icetea/app/abcihandler')
const { IceteaWeb3 } = require('@iceteachain/web3')
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

describe('Strip Undefined in State', () => {
  test('one level', async () => {
    const src = `
        const msg = this.runtime.msg;
        switch (msg.name) {
        case 'getValue':
            return this.getState('v');
        case 'setValue':
            return this.setState('v', Object.freeze({ x: undefined, a: 0, b: undefined, c: false, d: undefined, e: null }));
        case 'setValue2':
            return this.setState('v', Object.freeze([undefined, 0, undefined, null, '1', false, undefined]));
        }`

    const { privateKey, address: from } = account10k
    tweb3.wallet.importAccount(privateKey)

    const contract = await tweb3.deployJs(src, [], { from })
    expect(contract.address).toBeTruthy()

    let r = await contract.methods.getValue().call()
    expect(r).toBe(undefined)

    await contract.methods.setValue().sendCommit({ from })
    r = await contract.methods.getValue().call()
    expect(r).toEqual({ a: 0, c: false, e: null })

    await contract.methods.setValue2().sendCommit({ from })
    r = await contract.methods.getValue().call()
    expect(r).toEqual([
      null, 0,
      null, null,
      '1', false,
      null
    ])
  })

  test('deep level', async () => {
    const src = `
        const msg = this.runtime.msg, get = this.getState, set = this.setState;
        switch (msg.name) {
        case 'getValue':
            return {
                o1: get('o1'),
                o2: get('o2'),
                o3: get('o3'),
                a1: get('a1')
            }
        case 'setValue':
            set('o1', Object.freeze({ x: undefined, y: { a: undefined, b: undefined}, z: undefined }));
            set('o2', Object.freeze({ x: undefined, y: Object.freeze({ a: undefined, b: undefined, c: { d: undefined }}), z: undefined }));
            set('o3', { x: undefined, y: Object.freeze({ a: undefined, b: undefined}), z: undefined });
            set('a1', Object.freeze([
                undefined, 
                undefined, 
                Object.freeze([
                    undefined, 
                    undefined, 
                    Object.freeze({ 
                        a: undefined, 
                        b: undefined 
                    })
                ])
            ]))
        }`

    const { privateKey, address: from } = account10k
    tweb3.wallet.importAccount(privateKey)

    const contract = await tweb3.deployJs(src, [], { from })
    expect(contract.address).toBeTruthy()

    let r = await contract.methods.getValue().call()
    expect(r).toEqual({ o1: undefined, o2: undefined, o3: undefined, a1: undefined })

    await contract.methods.setValue().sendCommit({ from })
    r = await contract.methods.getValue().call()
    expect(r).toEqual({
      o1: { y: {} },
      o2: { y: { c: {} } },
      o3: { y: {} },
      a1: [null, null, [null, null, {}]]
    })
  })
})
