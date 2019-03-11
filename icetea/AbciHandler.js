const { getBlock, getTx, replyQuery } = require('./helper/abci')
const app = require('./App')

// turn on debug logging
require('debug').enable('abci*')

// turn on logging state diff to console
if (process.env.NODE_ENV === 'development' && process.env.PRINT_STATE_DIFF === '1') {
  app.addStateObserver(require('./helper/diff'))
}

module.exports = () => {
  return app.loadState().then(() => handler)
}

const handler = {

  async info () {
    return Object.assign({
      data: 'icetea',
      version: '0.0.1',
      appVerion: '0.0.1'
    }, await app.activate())
  },

  checkTx (req) {
    try {
      app.checkTx(getTx(req))
      return {}
    } catch (err) {
      return { code: 1, log: String(err) }
    }
  },

  beginBlock (req) {
    app.setBlock(getBlock(req))
    return {}
  },

  async deliverTx (req) {
    try {
      const tx = getTx(req)

      const [data, tags] = await app.execTx(tx)

      const result = {}
      if (typeof data !== 'undefined') {
        result.data = Buffer.from(JSON.stringify(data))
      }

      result.tags = []
      if (typeof tags !== 'undefined' && Object.keys(tags).length) {
        Object.keys(tags).forEach((key) => {
          result.tags.push({ key: Buffer.from(key), value: Buffer.from(tags[key]) })
        })
      }

      // add system tags
      result.tags.push({ key: Buffer.from('tx.from'), value: Buffer.from(tx.from) })
      result.tags.push({ key: Buffer.from('tx.to'), value: Buffer.from(tx.isContractCreation() ? data : tx.to) })

      // console.log(result);
      return result
    } catch (err) {
      console.error(err)
      return { code: 1, log: String(err) }
    }
  },

  commit () {
    return { data: app.persistState() } // return the block stateRoot
  },

  async query (req) {
    try {
      // console.log(req.path, req.data.toString(), req.prove || false);

      // TODO: handle replying merkle proof to client if requested

      // const prove = !!req.prove;

      const path = req.path
      const data = req.data.toString()

      switch (path) {
        case 'balance':
          return replyQuery({
            balance: app.balanceOf(data)
          })
        case 'state':
          return replyQuery(app.debugState())
        case 'contracts':
          return replyQuery(app.getContractAddresses())
        case 'metadata': {
          return replyQuery(await app.getMetadata(data))
        }
        case 'invokeView':
        case 'invokePure': {
          try {
            const options = JSON.parse(data)
            const result = await app[path](options.address, options.name, options.params, options.options)
            return replyQuery({
              success: true,
              data: result
            })
          } catch (error) {
            console.log(error)
            return replyQuery({
              success: false,
              error: String(error)
            })
          }
        }
      }

      return { code: 1, info: 'Path not supported' }
    } catch (error) {
      return { code: 2, info: String(error) }
    }
  }
}
