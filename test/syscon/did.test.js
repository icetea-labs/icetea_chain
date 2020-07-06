/* global jest describe test expect beforeAll afterAll */

const { randomAccountWithBalance, sleep } = require('../helper')
const { startupWith } = require('../../icetea/app/abcihandler')
const { IceteaWeb3 } = require('@iceteachain/web3')
const server = require('abci')
const createTempDir = require('tempy').directory
const { ecc } = require('@iceteachain/common')

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

describe('did', () => {
  test('did test', async () => {
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

    // then remove it
    await ms.removeTag(from, 'testName').sendCommit({ from })
    did = await ms.query(from).call({ from })
    expect(did).toBe(undefined)

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
    expect(did).toBe(undefined)

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

  test('did access token', async () => {
    const { privateKey, address: from } = account10k
    tweb3.wallet.importAccount(privateKey)

    const ms = tweb3.contract('system.did').methods

    // token account
    const account1 = ecc.newBankKeys()
    tweb3.wallet.importAccount(account1.privateKey)

    // token account
    const token = ecc.newKeys()
    tweb3.wallet.importAccount(token.privateKey)

    // will use the token to call this function
    const registerAlias = (alias, addr, fromAddr, signers) => {
      fromAddr = fromAddr || from
      signers = signers || token
      return tweb3.contract('system.alias').methods.register(alias, addr).sendCommit({
        from: fromAddr.address || fromAddr,
        signers: signers.address || signers
      })
    }

    const queryAlias = alias => {
      return tweb3.contract('system.alias').methods.query(alias).call()
    }

    const grant = (ownerAddr, contractAddr, tokenAddr, duration, fromAddr) => {
      fromAddr = fromAddr || from
      tokenAddr = tokenAddr.address || tokenAddr
      return ms.grantAccessToken(ownerAddr, contractAddr, tokenAddr, duration).sendCommit({ from: fromAddr.address || fromAddr })
    }

    const revoke = (ownerAddr, contractAddr, tokenAddr, fromAddr) => {
      fromAddr = fromAddr || from
      tokenAddr = tokenAddr.address || tokenAddr
      return ms.revokeAccessToken(ownerAddr, contractAddr, tokenAddr).sendCommit({ from: fromAddr.address || fromAddr })
    }

    // use the token without grant first, it should fail
    await expect(registerAlias('test1', from)).rejects.toThrowError('Permission denied')

    // grant token from non-owner, it should fail
    const DURATION = 5 * 60 * 1000
    await expect(grant(from, 'system.alias', token, DURATION, account1)).rejects.toThrowError('Permission denied')

    // grant token from owner, should ok
    await grant(from, 'system.alias', token, DURATION, from)
    let did = await ms.query(from).call()
    expect(did.tokens['system.alias'][token.address]).toBeDefined()

    // grant other token from the token, it should fail, because token does not have admin right
    await expect(grant(from, 'system.alias', account1, DURATION, token)).rejects.toThrowError('Permission denied')

    // transfer from a token, it should fail, token can only sign
    const transfer = (from, to, amount, signers) => {
      return tweb3.transfer(to, amount, { from, signers })
    }
    await expect(transfer(from, account1.address, 1, token.address)).rejects.toThrowError('Permission denied')

    // use the token to call without attaching any value, should ok
    await registerAlias('test1', from)
    const alias = await queryAlias('account.test1')
    expect(alias['account.test1'].address).toBe(from)

    // test grant 2 contracts at a time
    const token1 = ecc.newKeys().address
    await grant(from, ['system.did', 'system.faucet'], token1, DURATION, from)
    did = await ms.query(from).call()
    expect(Object.keys(did.tokens).length).toBe(3)
    expect(did.tokens['system.did'][token1]).toBeDefined()
    expect(did.tokens['system.faucet'][token1]).toBeDefined()

    // test grant 2 contracts at a time for blank account (register)
    const token2 = ecc.newKeys().address
    await grant(account1.address, ['system.did', 'system.faucet'], token2, DURATION, account1)
    did = await ms.query(account1.address).call()
    expect(Object.keys(did.tokens).length).toBe(2)
    expect(did.tokens['system.did'][token2]).toBeDefined()
    expect(did.tokens['system.faucet'][token2]).toBeDefined()

    // revoke a token from non-owner, should fail
    await expect(revoke(from, 'system.alias', token, account1)).rejects.toThrowError('Permission denied')

    // revoke token from other token, should fail
    await grant(from, 'system.alias', token1, DURATION, from)
    await expect(revoke(from, 'system.alias', token1, token)).rejects.toThrowError('Permission denied')

    // revoke token from admin, should ok
    await revoke(from, 'system.alias', token, from)

    // try to sign from the revoke token, should fail
    await expect(registerAlias('test2', from, from, token)).rejects.toThrowError('Permission denied')

    // register a short live token
    const shortToken = ecc.newKeys()
    const shortToken1 = ecc.newKeys()
    tweb3.wallet.importAccount(shortToken.privateKey)
    // 1 millisecond
    await grant(account1.address, 'system.alias', shortToken1, 1, account1)
    await grant(account1.address, 'system.alias', shortToken, 1, account1)
    did = await ms.query(account1.address).call()
    expect(Object.keys(did.tokens['system.alias']).length).toBe(1) // the shortToken1 is expired and should be deleted
    await sleep(100)
    // try to sign from the token, should fail because it is expired
    await expect(registerAlias('test2', account1.address, account1, shortToken)).rejects.toThrowError('Permission denied')

    // re-grant for longer life
    await grant(account1.address, 'system.alias', shortToken, DURATION, account1)
    await sleep(100)
    // try to sign from the token, should ok because we refresh the token
    await registerAlias('test2', account1.address, account1, shortToken)
    did = await ms.query(account1.address).call()
    expect(Object.keys(did.tokens['system.alias']).length).toBe(1)
  })

  test('did access token with alias', async () => {
    const { privateKey, address: from } = account10k
    tweb3.wallet.importAccount(privateKey)

    // token account
    const token = ecc.newBankKeys()
    tweb3.wallet.importAccount(token.privateKey)

    const src = "return 'ok';"
    let r = await tweb3.deploy(src, { from })
    const contract = tweb3.contract(r)

    // register alias for the new contract
    const alias = 'contract.xxx'
    await tweb3.contract('system.alias').methods.register(alias.split('.')[1], contract.address).sendCommit({ from })

    const getOk = c => {
      return (c || contract).methods.xxx().sendCommit({
        from: from,
        signers: token.address
      })
    }

    const did = tweb3.contract('system.did').methods
    const duration = 5 * 60 * 1000

    // first, grant to the contract by address
    await did.grantAccessToken(from, contract.address, token.address, duration).sendCommit({ from })

    // call the method with the access token
    r = await getOk()
    expect(r.returnValue).toBe('ok')

    // then, revoke the access token
    await did.revokeAccessToken(from, contract.address, token.address).sendCommit({ from })

    // call the method again, this time should fail
    await expect(getOk()).rejects.toThrowError('Permission denied')

    // now, grant by the alias
    await did.grantAccessToken(from, alias, token.address, duration).sendCommit({ from })

    // call the method with the access token
    r = await getOk()
    expect(r.returnValue).toBe('ok')

    // call by the alias, should also ok
    r = await getOk(tweb3.contract(alias))
    expect(r.returnValue).toBe('ok')

    // then, revoke the access token
    await did.revokeAccessToken(from, alias, token.address).sendCommit({ from })

    // call the method again, this time should fail
    await expect(getOk()).rejects.toThrowError('Permission denied')

    // call with alias, should also fail
    await expect(getOk(tweb3.contract(alias))).rejects.toThrowError('Permission denied')
  })
})
