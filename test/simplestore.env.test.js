/* global jest describe test expect */

const { IceTeaWeb3 } = require('../tweb3')
const ecc = require('../icetea/helper/ecc')
const { switchEncoding } = require('../tweb3/utils')
const tweb3 = new IceTeaWeb3('http://localhost:3001/api')
const { TxOp, ContractMode } = require('../icetea/enum')

jest.setTimeout(30000)

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
                this.emitEvent('valueChanged', {value: msg.params[0]})
                break;
            default:
                // call unsupported function -> inform caller our function list
                return {
                    'getValue': { decorators: ['view'] },
                    'setValue': { decorators: ['transaction'] }
                }
            }`

    const privateKey = '5K4kMyGz839wEsG7a9xvPNXCmtgFE5He2Q8y9eurEQ4uNgpSRq7'

    const from = ecc.toPublicKey(privateKey)
    const fromBalance = (await tweb3.getBalance(from)).balance
    expect(fromBalance).toBeGreaterThan(1000)

    const value = 100.5
    const fee = 0.1

    const data = {
      op: TxOp.DEPLOY_CONTRACT,
      mode: ContractMode.JS_RAW,
      src: switchEncoding(CONTRACT_SRC, 'utf8', 'base64')
    }

    const result = await tweb3.sendTransactionCommit({ from, value, fee, data }, privateKey)
    expect(result.deliver_tx.code).toBeFalsy()

    const tags = tweb3.utils.decodeTags(result)
    expect(tags['tx.from']).toBe(from)
    expect(typeof tags['tx.to']).toBe('string')
    const to = tags['tx.to']

    const events = tweb3.utils.decodeEventData(result)
    expect(events.length).toBe(1)
    expect(events[0]).toEqual({
      emitter: 'system',
      eventName: 'Transferred',
      eventData: { from, to, value }
    })

    const newFromBalance = await tweb3.getBalance(from)
    expect(newFromBalance.balance).toBe(fromBalance - value - fee)

    const newToBalance = await tweb3.getBalance(to)
    expect(newToBalance.balance).toBe(value)
  })
})
