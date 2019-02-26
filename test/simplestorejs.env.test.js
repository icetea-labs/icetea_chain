/* global jest describe test expect */

const { IceTeaWeb3 } = require('../tweb3')
const ecc = require('../icetea/helper/ecc')
const { switchEncoding } = require('../tweb3/utils')
const { TxOp, ContractMode } = require('../icetea/enum')

jest.setTimeout(30000)

let tweb3
beforeAll(() => {
  tweb3 = new IceTeaWeb3('http://localhost:3001/api')
})

afterAll(() => {
  tweb3.close()
});

async function testSimpleStore (mode, src) {
  const privateKey = '5K4kMyGz839wEsG7a9xvPNXCmtgFE5He2Q8y9eurEQ4uNgpSRq7'

  const from = ecc.toPublicKey(privateKey)
  const fromBalance = (await tweb3.getBalance(from)).balance
  expect(fromBalance).toBeGreaterThan(1000)

  const value = 100.5
  const fee = 0.1

  const data = {
    op: TxOp.DEPLOY_CONTRACT,
    mode,
    src: switchEncoding(src, 'utf8', 'base64')
  }

  const result = await tweb3.sendTransactionCommit({ from, value, fee, data }, privateKey)
  expect(result.deliver_tx.code).toBeFalsy()

  // tags must be correct
  const tags = tweb3.utils.decodeTags(result)
  expect(tags['tx.from']).toBe(from)
  expect(typeof tags['tx.to']).toBe('string')
  const to = tags['tx.to']

  // since value > 0, a system 'Transferred' event must be emitted
  const events = tweb3.utils.decodeEventData(result)
  expect(events.length).toBe(1)
  expect(events[0]).toEqual({
    emitter: 'system',
    eventName: 'Transferred',
    eventData: { from, to, value }
  })

  // Verify balance changes after TX

  const newFromBalance = await tweb3.getBalance(from)
  expect(newFromBalance.balance).toBe(fromBalance - value - fee)

  const newToBalance = await tweb3.getBalance(to)
  expect(newToBalance.balance).toBe(value)

  // check owner
  const owner = (await tweb3.callReadonlyContractMethod(to, 'getOwner')).data
  expect(owner).toBe(from)

  const value2Set = 100

  // Set value
  const data2 = {
    op: TxOp.CALL_CONTRACT,
    name: 'setValue',
    params: [value2Set]
  }

  const result2 = await tweb3.sendTransactionCommit({ from, to, data: data2 }, privateKey)
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
  const valueCheck = (await tweb3.callReadonlyContractMethod(to, 'getValue')).data
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
                require(this.#owner == msg.sender, 'Only contract owner can set value')
                require(value, 'Invalid value')
                this.#value = value
                this.emitEvent("ValueChanged", {value: this.#value})
            }
        }`

    await testSimpleStore(ContractMode.JS_DECORATED, CONTRACT_SRC)
  })
})