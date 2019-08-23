const { getBlock, getTx, replyQuery } = require('./helper/abci')
const { codec } = require('@iceteachain/common')
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

  initChain (args) {
    app.installSystemContracts(args)
    app.initValidators()
    return args // return same consensusParams and validators as defined in consensus.json
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

  endBlock (req) {
    const height = Number(req.height.toString())
    return app.endBlock(height)
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
      height = Number(req.height)
      if (height && !['balance', 'state', 'validators'].includes(path)) {
        return { code: 2, info: 'Height is not supported for this path.' }
      }

      data = (req.data && req.data.length) ? codec.decode(req.data) : req.data

      switch (path) {
        case 'balance':
          return replyQuery({
            balance: await app.balanceOf(data, height)
          })
        case 'state':
          return replyQuery(await app.debugState(height))
        case 'validators':
          return replyQuery(await app.getValidators(height))
        case 'contracts':
          return replyQuery(app.getContractAddresses(data))
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
          const result = app[path](data.address, data.name, data.params, data.options)
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
