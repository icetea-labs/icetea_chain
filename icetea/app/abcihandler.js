const { getBlock, getTx, replyQuery } = require('../helper/abci')
const { codec } = require('@iceteachain/common')
const app = require('./app')
const utils = require('../helper/utils')
const debug = require('debug')('icetea:abci')
const config = require('../config')
const { merge } = require('lodash')

// turn on logging state diff to console
if (utils.isDevMode() && utils.envEnabled('PRINT_STATE_DIFF')) {
  app.addStateObserver(require('../helper/diff'))
}

exports.startup = extraConfig => {
  if (extraConfig) {
    const t = typeof extraConfig
    if (t === 'object') {
      merge(config, extraConfig)
    } else if (t === 'function') {
      extraConfig(config)
    }
  }
  // no more change to config from now on
  utils.deepFreeze(config)

  return app.loadState(config.state.path).then(() => handler)
}

// A shortcut version of startup with commonly used params
exports.startupWith = ({ path, freeGasLimit }) => exports.startup(cfg => {
  if (path != null) {
    cfg.state.path = path
  }
  if (freeGasLimit != null) {
    cfg.gas.freeGasLimit = freeGasLimit
  }
})

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
    // TODO: distribute awards and punish byzantine validators

    app.setBlock(getBlock(req))
    return {}
  },

  endBlock (req) {
    const height = Number(req.height.toString())
    return utils.envDevEnabled('FIXED_VALIDATORS') ? {} : app.endBlock(height)
  },

  deliverTx (req) {
    let tx
    try {
      tx = getTx(req)

      const events = []
      const data = app.execTx(tx, events)

      const result = {}
      if (typeof data !== 'undefined') {
        result.data = utils.serialize(data)
      }

      result.events = events
      // if (typeof events !== 'undefined' && Object.keys(events).length) {
      //   Object.keys(events).forEach((key) => {
      //     let value = events[key]
      //     if (Buffer.isBuffer(value)) {
      //       // juse keep
      //     } else if (typeof value === 'string') {
      //       value = Buffer.from(value)
      //     } else {
      //       throw new Error(`Event value for key ${key} is has wrong type, expect: Buffer or string, got: ${typeof tags[key]}`)
      //     }
      //     // result.tags.push({ key: Buffer.from(key), value })
      //     result.events.push({ type: 'icetea', attributes: [{ key: Buffer.from(key), value }] })
      //   })
      // }

      // add system events
      _addSystemEvents(result.events, tx, data)

      return result
    } catch (err) {
      debug('TX execution error. Transaction data: ', tx || req)
      debug(err)

      const events = []
      _addSystemEvents(events, tx)
      return { code: 2, events, log: String(err) }
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
      return { code: 3, info: String(error), log: error.stack }
    }
  }
}

const _addSystemEvents = (events, tx, data) => {
  const attributes = []
  attributes.push({ key: Buffer.from('from'), value: Buffer.from(tx.from) })
  const txTo = tx.isContractCreation() ? data : tx.to
  if (txTo) {
    attributes.push({ key: Buffer.from('to'), value: Buffer.from(txTo) })
  }
  attributes.push({ key: Buffer.from('payer'), value: Buffer.from(tx.payer) })
  events.push({ type: 'system/tx', attributes })
}
