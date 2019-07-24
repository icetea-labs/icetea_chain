const { getBlock, getTx, replyQuery } = require('./helper/abci')
const app = require('./app')
const utils = require('./helper/utils')
const debug = require('debug')('icetea:abci')

// turn on logging state diff to console
if (utils.isDevMode() && utils.envEnabled('PRINT_STATE_DIFF')) {
  app.addStateObserver(require('./helper/diff'))
}

module.exports = (config = {}) => {
  const path = config.path || './state'
  const freeGasLimit = config.freeGasLimit
  return app.loadState({ path, freeGasLimit }).then(() => handler)
}

const handler = {

  initChain ({ consensusParams, validators }) {
    app.installSystemContracts()
    return { consensusParams, validators }
  },

  async info () {
    return Object.assign({
      data: 'icetea',
      version: '0.0.1',
      appVerion: '0.0.1'
    }, await app.activate())
  },

  checkTx (req) {
    let tx
    try {
      tx = getTx(req)
      app.checkTx(tx)
      return {}
    } catch (err) {
      debug('TX checking error. Transaction data: ', tx || req)
      debug(err)
      return { code: 1, log: String(err) }
    }
  },

  beginBlock (req) {
    app.setBlock(getBlock(req))
    return {}
  },

  deliverTx (req) {
    let tx
    try {
      tx = getTx(req)

      const tags = []
      const data = app.execTx(tx, tags)

      const result = {}
      if (typeof data !== 'undefined') {
        result.data = Buffer.from(utils.serialize(data))
      }

      result.tags = []
      if (typeof tags !== 'undefined' && Object.keys(tags).length) {
        Object.keys(tags).forEach((key) => {
          if (typeof tags[key] !== 'string') {
            throw new Error(`Tag value for key ${key} is has wrong type, expect: string, got: ${typeof tags[key]}`)
          }
          result.tags.push({ key: Buffer.from(key), value: Buffer.from(tags[key]) })
        })
      }

      // add system tags
      _addSystemTags(result.tags, tx, data)

      return result
    } catch (err) {
      debug('TX execution error. Transaction data: ', tx || req)
      debug(err)

      const tags = []
      _addSystemTags(tags, tx)
      return { code: 2, tags, log: String(err) }
    }
  },

  async commit () {
    const data = await app.persistState()
    return { data } // return the block stateRoot
  },

  async query (req) {
    let path, data, height, prove
    try {
      // TODO: handle replying merkle proof to client if requested

      prove = !!req.prove
      if (prove) {
        return { code: 4, info: 'Prove not yet supported.' }
      }

      path = req.path
      data = String(req.data)
      height = Number(req.height)

      if (height && !['balance', 'state'].includes(path)) {
        return { code: 2, info: 'Height is not supported for this path.' }
      }

      switch (path) {
        case 'balance':
          return replyQuery({
            balance: await app.balanceOf(data, height)
          })
        case 'state':
          return replyQuery(await app.debugState(height))
        case 'contracts':
          return replyQuery(app.getContractAddresses(data === 'true'))
        case 'metadata': {
          return replyQuery(app.getMetadata(data))
        }
        case 'account_info': {
          return replyQuery(app.getAccountInfo(data))
        }
        case 'contract_src': {
          return replyQuery(app.getContractSource(data))
        }
        case 'invokeView':
        case 'invokePure': {
          const options = JSON.parse(data)
          const result = app[path](options.address, options.name, options.params, options.options)
          return replyQuery(result)
        }
      }

      return { code: 1, info: 'Path not supported.' }
    } catch (error) {
      debug('ABCI Query error. Path: ', path, ', data: ', data, ', height: ', height, ', prove: ', prove)
      debug(error)
      return { code: 3, info: String(error) }
    }
  }
}

const _addSystemTags = (tags, tx, data) => {
  tags.push({ key: Buffer.from('tx.from'), value: Buffer.from(tx.from) })
  const txTo = tx.isContractCreation() ? data : tx.to
  if (txTo) {
    tags.push({ key: Buffer.from('tx.to'), value: Buffer.from(txTo) })
  }
  tags.push({ key: Buffer.from('tx.payer'), value: Buffer.from(tx.payer) })
}
