/* global jest describe test expect beforeAll afterAll */

const { randomAccountWithBalance, sleep } = require('../helper')
const startup = require('../../icetea/abcihandler')
const { IceteaWeb3 } = require('@iceteachain/web3')
const server = require('abci')
const createTempDir = require('tempy').directory
const { ecc } = require('@iceteachain/common')

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

describe('did', () => {
  test('did test', async () => {
    const { privateKey, address: from } = account10k
    tweb3.wallet.importAccount(privateKey)

    const ms = tweb3.contract('system.did').methods

    // the address should not have did
    let did = await ms.query(from).call({ from })
    expect(did).toBe(null)

    // now add a tag
    await ms.setTag(from, 'testName', 'testValue').sendCommit({ from })
    did = await ms.query(from).call({ from })
    expect(did).toEqual({
      tags: {
        testName: 'testValue'
      }
    })

    // then remove it
    await ms.removeTag(from, 'testName').sendCommit({ from })
    did = await ms.query(from).call({ from })
    expect(did).toBe(null)

    // add again, using object
    await ms.setTag(from, { testName: 'testValue' }).sendCommit({ from })
    did = await ms.query(from).call({ from })
    expect(did).toEqual({
      tags: {
        testName: 'testValue'
      }
    })

    // change value
    await ms.setTag(from, { testName: 'testValue2' }).sendCommit({ from })
    did = await ms.query(from).call({ from })
    expect(did).toEqual({
      tags: {
        testName: 'testValue2'
      }
    })

    // test no right
    const newAccount = ecc.newBankKeys()
    tweb3.wallet.importAccount(newAccount.privateKey)

    const setFromNewAccount = () => {
      return ms.setTag(from, { testName: 'testValue3' }).sendCommit({ from: newAccount.address })
    }
    await expect(setFromNewAccount()).rejects.toThrowError('Permission denied')

    const transferFromNewAccount = () => {
      return tweb3.transfer(from, 100, { from, signers: newAccount.address })
    }
    await expect(transferFromNewAccount()).rejects.toThrowError('Permission denied')

    // now we add owner
    await ms.addOwner(from, newAccount.address).sendCommit({ from })
    did = await ms.query(from).call({ from })
    expect(did).toEqual({
      owners: {
        [newAccount.address]: 1
      },
      tags: {
        testName: 'testValue2'
      }
    })

    // set tag again
    await setFromNewAccount()
    did = await ms.query(from).call({ from })
    expect(did).toEqual({
      owners: {
        [newAccount.address]: 1
      },
      tags: {
        testName: 'testValue3'
      }
    })

    // transfer now, should ok (no exception)
    await transferFromNewAccount()

    // now add self
    await ms.addOwner(from, from, 2).sendCommit({ from: newAccount.address })
    did = await ms.query(from).call({ from })
    expect(did).toEqual({
      owners: {
        [newAccount.address]: 1,
        [from]: 2
      },
      tags: {
        testName: 'testValue3'
      }
    })

    // remove owner
    await ms.clearOwnership(from).sendCommit({ from: newAccount.address })
    did = await ms.query(from).call({ from })
    expect(did).toEqual({
      tags: {
        testName: 'testValue3'
      }
    })

    // just to confirm no ownership now
    await expect(transferFromNewAccount()).rejects.toThrowError('Permission denied')

    // remove the tag for short code
    await ms.removeTag(from, 'testName').sendCommit({ from })
    did = await ms.query(from).call({ from })
    expect(did).toBe(null)

    const claimFromNewAccount = () => {
      return ms.claimInheritance(from, newAccount.address).sendCommit({ from })
    }

    // claim while you are not an inheritor
    await expect(claimFromNewAccount()).rejects.toThrowError('No inheritors')

    // then, let's add an inheritance
    await ms.addInheritor(from, newAccount.address, 1, 2).sendCommit({ from })
    did = await ms.query(from).call({ from })
    expect(did).toEqual({
      inheritors: {
        [newAccount.address]: {
          waitPeriod: 1,
          lockPeriod: 2
        }
      }
    })

    await claimFromNewAccount()

    did = await ms.query(from).call({ from })
    expect(did.inheritors[newAccount.address].state).toBe(1)

    // inheritor has to wait
    await expect(transferFromNewAccount()).rejects.toThrowError('Permission denied')

    // reclaim
    await expect(claimFromNewAccount()).rejects.toThrowError('Already claimed')

    const rejectClaim = () => {
      return ms.rejectInheritanceClaim(from, newAccount.address).sendCommit({ from })
    }
    await rejectClaim()
    did = await ms.query(from).call({ from })
    expect(did.inheritors[newAccount.address].state).toBe(2)

    // reject again
    await expect(rejectClaim()).rejects.toThrowError('does not currently claim')

    // reclaim - should be locked
    await expect(claimFromNewAccount()).rejects.toThrowError('locked')
  })
})
