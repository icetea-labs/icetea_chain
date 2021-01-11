/* global jest describe test expect beforeAll afterAll */

const { ecc } = require('@iceteachain/common')
const { sleep, randomAccountWithBalance } = require('../helper')
const { startupWith } = require('../../icetea/app/abcihandler')
const { IceteaWeb3 } = require('@iceteachain/web3')
const server = require('abci')
const createTempDir = require('tempy').directory
const killable = require('killable')

jest.setTimeout(30000)

let tweb3
let account10k // this key should have 10k of coins before running test suite
let instance

const closeAll = () => {
  return new Promise(resolve => {
    global.restartNode().then(() => {
      instance.kill(resolve)
    })
  })
}

beforeAll(async () => {
  const handler = await startupWith({ path: createTempDir() })
  instance = server(handler)
  instance.listen(global.ports.abci)
  killable(instance)
  await sleep(4000)

  tweb3 = new IceteaWeb3(`http://127.0.0.1:${global.ports.rpc}`)
  account10k = await randomAccountWithBalance(tweb3, 10000)
})

afterAll(() => {
  tweb3.close()
  instance.close()
})

describe('replay protection', () => {
  test('transfer with same transaction will throw err', async () => {
    const { privateKey, address: from } = account10k
    tweb3.wallet.importAccount(privateKey)
    const keyInfo = await ecc.newBankKeys()

    const tx = { from, to: keyInfo.address, value: 1000 }
    const txSigned = await tweb3.signTransaction(tx, { from })

    await tweb3.sendRawTransaction(txSigned, 'commit')

    // thrown by tendermint because it is in cache
    await expect(tweb3.sendRawTransaction(txSigned, 'commit')).rejects.toThrowError('error on broadcastTxCommit: tx already exists in cache')

    // now we restart Icetea, the TX list should persists
    await closeAll()
    await sleep(1000)
    instance.listen(global.ports.abci)
    await sleep(4000)

    // thrown by icetea, because tendermint has no cache now since it restarted
    await expect(tweb3.sendRawTransaction(txSigned, 'commit')).rejects.toThrowError('This transaction was already included in blockchain, no need to send again.')
  })
})
