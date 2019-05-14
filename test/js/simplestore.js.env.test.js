/* global jest describe test expect beforeAll afterAll */

const { web3, randomAccountWithBalance, switchEncoding } = require('../helper')
const { TxOp, ContractMode } = require('icetea-common')

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

async function testSimpleStore (mode, src) {
  const { privateKey, address: from } = account10k
  tweb3.wallet.importAccount(privateKey)

  const fromBalance = Number((await tweb3.getBalance(from)).balance)
  expect(fromBalance).toBeGreaterThan(1000)

  const value = 2
  const fee = 1

  const data = {
    op: TxOp.DEPLOY_CONTRACT,
    mode,
    src: switchEncoding(src, 'utf8', 'base64')
  }

  const result = await tweb3.sendTransactionCommit({ from: account10k.address, value, fee, data })
  expect(result.deliver_tx.code).toBeFalsy()

  // tags must be correct
  const tags = tweb3.utils.decodeTags(result)
  expect(tags['tx.from']).toBe(from)
  expect(typeof tags['tx.to']).toBe('string')
  const to = tags['tx.to']

  expect(to).toBe(result.result)

  // since value > 0, a system 'Transferred' event must be emitted
  const events = tweb3.utils.decodeEventData(result)
  expect(events.length).toBe(1)
  expect(events[0]).toEqual({
    emitter: 'system',
    eventName: 'Transferred',
    eventData: { from, to, value: value.toString() }
  })

  // Verify balance changes after TX

  const newFromBalance = await tweb3.getBalance(from)
  expect(Number(newFromBalance.balance)).toBe(fromBalance - value - fee)

  const newToBalance = await tweb3.getBalance(to)
  expect(Number(newToBalance.balance)).toBe(value)

  // Verify getContracts
  const contracts = await tweb3.getContracts()
  expect(contracts).toContain(to)

  // Verify medatada
  const meta = await tweb3.getMetadata(to)
  expect(meta.getOwner.decorators[0]).toEqual('view')
  expect(meta.getValue.decorators[0]).toEqual('view')
  expect(meta.setValue.decorators[0]).toEqual('transaction')

  // check owner
  const owner = await tweb3.callReadonlyContractMethod(to, 'getOwner')
  expect(owner).toBe(from)

  const value2Set = 100

  // Set value
  const data2 = {
    op: TxOp.CALL_CONTRACT,
    name: 'setValue',
    params: [value2Set]
  }

  const result2 = await tweb3.sendTransactionCommit({ from: account10k.address, to, data: data2 })
  expect(result2.deliver_tx.code).toBeFalsy()

  // Check ValueChanged event was emit
  const events2 = tweb3.utils.decodeEventData(result2)
  expect(events2.length).toBe(1)
  expect(events2[0]).toEqual({
    emitter: to,
    eventName: 'ValueChanged',
    eventData: { value: value2Set }
  })

  // Get the value after check
  const valueCheck = await tweb3.callReadonlyContractMethod(to, 'getValue')
  expect(valueCheck).toBe(value2Set)
}

describe('SimpleStore', () => {
  test('raw JS valid-syntax simple store', async () => {
    const CONTRACT_SRC = `
            const msg = this.getEnv().msg;
            switch (msg.name) {
            case '__on_deployed':
                this.setState('owner', msg.sender);
                break;
            case '__on_received':
                return msg.value;
            case 'getOwner':
                return this.getState('owner');
            case 'getValue':
                return this.getState('value');
            case 'setValue':
                if (this.getState('owner') !== msg.sender) {
                    throw new Error('Only contract owner can set value');
                }
                if (!msg.params || !msg.params.length) {
                    throw new Error('Invalid value');
                }
                this.setState('value', msg.params[0]);
                this.emitEvent('ValueChanged', {value: msg.params[0]})
                break;
            default:
                // call unsupported function -> inform caller our function list
                return {
                    'getOwner': { decorators: ['view'] },
                    'getValue': { decorators: ['view'] },
                    'setValue': { decorators: ['transaction'] }
                }
            }`

    await testSimpleStore(ContractMode.JS_RAW, CONTRACT_SRC)
  })

  test('decorated JS valid-syntax simple store', async () => {
    const CONTRACT_SRC = `
        @contract class SimpleStore  {
            @state #owner = msg.sender
            @state #value
            getOwner() { return this.#owner }
            getValue() { return this.#value }
            @transaction setValue(value) {
                expect(this.#owner == msg.sender, 'Only contract owner can set value')
                expect(value, 'Invalid value')
                this.#value = value
                this.emitEvent("ValueChanged", {value: this.#value})
            }
        }`

    await testSimpleStore(ContractMode.JS_DECORATED, CONTRACT_SRC)
  })
})
