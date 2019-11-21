const { randomAccountWithBalance, sleep, startupWithGas } = require('../helper')
const { ContractMode } = require('@iceteachain/common')
const { IceteaWeb3 } = require('@iceteachain/web3')
const server = require('abci')
const transpile = global.transpile

jest.setTimeout(30000)

let tweb3
let account10k // this key should have 10k of coins before running test suite
let instance
beforeAll(async () => {
  const handler = await startupWithGas()
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

const hackerSrc = `
  const _ = require('lodash')

  @contract class Hacker {
    @state value

    @pure changeFunc() {
      let isNil = _.isNil
      isNil = undefined
      _.isNil = undefined
    }

    @pure useFunc() {
      return _.isNil(undefined)
    }

    @pure usegasPure() {
      __guard.usegas = undefined
    }

    @view usegasView() {
      let usegas = __guard.usegas
      usegas = undefined
      return __guard.usegas === undefined
    }

    @transaction circular() {
      let a = []
      a[0] = a
      this.value = a
    }
  }
`

describe('restart app', () => {
  test('some funny hack', async () => {
    const { privateKey, address: from } = account10k
    tweb3.wallet.importAccount(privateKey)

    const result = await tweb3.deploy(ContractMode.JS_RAW, (await transpile(hackerSrc)), [], { from })
    expect(result.address).toBeDefined()
    const hackerContract = tweb3.contract(result.address)

    await hackerContract.methods.changeFunc().callPure()
    await expect(hackerContract.methods.useFunc().callPure()).rejects.toThrow(Error)

    // jest does not implement require.cache so you should clear by hand
    // recommend to test on real environment
    // issue: https://github.com/facebook/jest/issues/5741
    jest.resetModules()

    const tmp = await hackerContract.methods.useFunc().callPure()
    expect(tmp).toBe(true)

    await expect(hackerContract.methods.usegasPure().callPure()).rejects.toThrow(Error)

    const r = await hackerContract.methods.usegasView().call()
    expect(r).toBe(false)

    const circular = await hackerContract.methods.circular().sendCommit()
    expect(circular.hash).toBeDefined()
  })

  test('prevent hack on deployment', async () => {
    const { privateKey, address: from } = account10k
    tweb3.wallet.importAccount(privateKey)

    await expect(tweb3.deploy(ContractMode.JS_RAW, await transpile(`
      @contract class Hack1 {
        constructor() {
          new Function("return process")().exit()
        }
      }
    `), [], { from })).rejects.toThrow(Error)

    await expect(tweb3.deploy(ContractMode.JS_RAW, await transpile(`
      @contract class Hack2 {
        constructor() {
          this.constructor.constructor("return process")().exit()
        }
      }
    `), [], { from })).rejects.toThrow(Error)

    await expect(tweb3.deploy(ContractMode.JS_RAW, await transpile(`
      @contract class Hack3 {
        constructor() {
          const require = new Function("return process.mainModule.require")();
          console.log(require);
        }
      }
    `), [], { from })).rejects.toThrow(Error)

    await expect(tweb3.deploy(ContractMode.JS_RAW, await transpile(`
      @contract class Hack4 {
        constructor() {
          const global = new Function("return global")();
          console.log(global);
        }
      }
    `), [], { from })).rejects.toThrow(Error)
  })
})
