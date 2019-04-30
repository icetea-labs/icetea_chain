/* global jest describe test expect beforeAll afterAll */

// const { ecc } = require('icetea-common')
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

describe('did', () => {
  test('set tag remove tag', async () => {
    const { privateKey, address: from } = account10k
    tweb3.wallet.importAccount(privateKey)

    const ms = tweb3.contract('system.did').methods

    // the address should not have did
    let did = await ms.query(from).call({ from })
    expect(did).toBe(undefined)

    // now add a tag
    await ms.setTag(from, 'testName', 'testValue').sendCommit({ from })
    did = await ms.query(from).call({ from })
    expect(did).toEqual({
      tags: {
        testName: 'testValue'
      }
    })
  })
})
