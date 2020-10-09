const axios = require('../../common/axios')
const pm2 = require('pm2')
const { healthCheck } = require('../../common/healthCheckTendermint')
const MockAdapter = require('axios-mock-adapter')
const schedule = require('node-schedule')

const tendermintName = process.env.TENDERMINT_NAME || 'tendermint'

jest.useFakeTimers('modern')
jest.mock('pm2')

const mock = new MockAdapter(axios)

beforeEach(() => {
  process.env.BOT_TOKEN = 123
})

describe('Send signal to kill tendermint process', () => {
  test('Return response if not timeout', async () => {
    const mockResponse = { jsonrpc: '2.0', id: -1, result: {} }
    mock.onGet('http://localhost:26657/health').reply(200, mockResponse)
    const resp = await healthCheck()
    expect(resp.data).toStrictEqual(mockResponse)
  })

  test('Return response if timeout one time', async () => {
    const mockSendSignal = jest.fn()
    pm2.sendSignalToProcessName = mockSendSignal
    mock.onGet('http://localhost:26657/health').timeoutOnce()
    expect(mockSendSignal).not.toBeCalled()
  })

  test('Send signal to tendermint process when timeout', async () => {
    const mockSendSignal = jest.fn()
    pm2.sendSignalToProcessName = mockSendSignal
    mock.onGet('http://localhost:26657/health').timeout()
    mock.onPost('https://api.telegram.org/bot123/sendMessage').reply(200)
    const resp = healthCheck()
    await expect(resp).rejects.toThrow('timeout of 5000ms exceeded')
    expect(mockSendSignal).toBeCalledTimes(1)
    expect(mockSendSignal).toBeCalledWith('SIGTERM', tendermintName)
  })

  test('Return error when not timeout error', async () => {
    const mockSendSignal = jest.fn()
    pm2.sendSignalToProcessName = mockSendSignal
    mock.onGet('http://localhost:26657/health').networkError()
    const resp = healthCheck()
    await expect(resp).rejects.toThrow('Network Error')
    expect(mockSendSignal).not.toBeCalled()
  })
})

describe('Schedule call', () => {
  test('Call method 1 time per hours', () => {
    const mockSchedule = jest.fn()
    schedule.scheduleJob('1 * * * *', mockSchedule)

    jest.advanceTimersByTime(1000 * 60 * 60)

    expect(mockSchedule).toHaveBeenCalledTimes(1)
  })

  test('Not call method before 1 hour have passed', () => {
    const mockSchedule = jest.fn()
    schedule.scheduleJob('1 * * * *', mockSchedule)

    jest.advanceTimersByTime(1)

    expect(mockSchedule).not.toBeCalled()
  })
})

afterEach(() => {
  process.env.BOT_TOKEN = undefined
})
