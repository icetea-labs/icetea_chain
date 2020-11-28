/* global jest describe test expect beforeAll afterAll */

const { sleep, randomAccountWithBalance } = require('../helper')
const { startupWith } = require('../../icetea/app/abcihandler')
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

async function compile (src, from) {
  return tweb3.deploy({ data: await transpile(src) }, { from })
}

async function testList (snip) {
  const { privateKey, address: from } = account10k
  tweb3.wallet.importAccount(privateKey)

  const SRC = `
    const animals = define${snip}List('animal', { keyType: 'number' })
    @contract class State  {
        @transaction addAnimals() {
            for (let i = 0; i < 10; i++) {
                animals.add({
                    ${snip ? '' : 'id: i,'}
                    name: 'animal ' + i,
                    num: i + 100,
                    gender: Boolean(i % 2)
                })
            }
        }

        @transaction delete(id1, id2) {
          animals.delete(id1, id2)
        }

        @view query(options) {
            return animals.query(options)
        }

        @view query2() {
          return animals.query({
            filter: a => a.id === 1
          })
        }

        @view reduce() {
          return animals.query({
            reduce: (a, c) => {
              a = a + c.id
              return a
            },
            reduceInitialValue: 0
          })
        }
    }`

  const ct = await compile(SRC, from)
  await ct.prepareMethod('addAnimals').sendCommit({ from })
  let r = await ct.prepareMethod('query').call()
  // console.log(r.length, r)
  expect(r.length).toBe(10)
  expect(r[0].id).toBe(0)
  expect(r[9].id).toBe(9)

  r = await ct.prepareMethod('query', {
    filter: { id: 1 },
    addCount: true
  }).call()
  // console.log(r)
  expect(r.length).toBe(2)
  expect(r[0].id).toBe(1)
  expect(r[1]).toBe(1)

  r = await ct.prepareMethod('query', {
    find: { id: 1 }
  }).call()
  // console.log(r)
  expect(r.id).toBe(1)

  r = await ct.prepareMethod('query2').call()
  // console.log(r)
  expect(r.length).toBe(1)
  expect(r[0].id).toBe(1)

  r = await ct.prepareMethod('reduce').call()
  // console.log(r)
  expect(r).toBe(45)

  r = await ct.prepareMethod('query', {
    maxBy: 'id'
  }).call()
  // console.log(r)
  expect(r.id).toBe(9)

  r = await ct.prepareMethod('query', {
    search: { id: { $lt: 2 } }
  }).call()
  // console.log(r)
  expect(r.length).toBe(2)
  expect(r[1].id).toBe(1)

  r = await ct.prepareMethod('query', [{
    search: { id: { $lt: 2 } }
  }, {
    maxBy: 'id'
  }]).call()
  // console.log(r)
  expect(r.id).toBe(1)

  await ct.prepareMethod('delete', 0, 9).sendCommit({ from })
  r = await ct.prepareMethod('query').call()
  // console.log(r.length, r)
  expect(r.length).toBe(8)
  expect(r[0].id).toBe(1)
  expect(r[7].id).toBe(8)

  r = await ct.prepareMethod('query', { count: true }).call()
  // console.log(r.length, r)
  expect(r).toBe(8)
}

describe('test state util', () => {
  test('auto list', async () => {
    await testList('Auto')
  })

  test('manual list', async () => {
    await testList('')
  })
})
