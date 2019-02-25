const createABCIServer = require('abci')

const codec = require('./helper/codec')

const StateManager = require('./StateManager')
const Tx = require('./Tx')

const stateManager = new StateManager()

// turn on debug logging
// require('debug').enable('abci*')

const handlers = {

  info (req) {
    return Object.assign({
      data: 'icetea',
      version: '0.0.1',
      appVerion: '0.0.1'
    }, stateManager.getLastState())
  },

  checkTx (req) {
    let reqTx = codec.decode(req.tx)
    // console.log("checkTx", reqTx);

    const tx = new Tx(
      reqTx.from,
      reqTx.to,
      reqTx.value,
      reqTx.fee,
      JSON.parse(reqTx.data || '{}'),
      reqTx.nonce)
    tx.setSignature(reqTx.signature)

    try {
      stateManager.checkTx(tx)
      return {}
    } catch (err) {
      return { code: 1, log: String(err) }
    }
  },

  beginBlock (req) {
    const hash = req.hash.toString('hex')
    const number = req.header.height.toNumber()
    const timestamp = req.header.time.seconds.toNumber()
    stateManager.beginBlock({ number, hash, timestamp })
    return {} // tags
  },

  async deliverTx (req) {
    try {
      const tx = getTx(req)

      stateManager.deliverTx(tx)
      const [data, tags] = await stateManager.execTx(tx)
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
      return { code: 1, log: String(err) }
    }
  },

  endBlock (req) {
    stateManager.endBlock()
    return {}
  },

  async commit (req) {
    return { data: await stateManager.commit() } // return the block stateRoot
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
            balance: stateManager.balanceOf(data)
          })
        case 'state':
          return replyQuery(stateManager)
        case 'contracts':
          return replyQuery(stateManager.getContractAddresses())
        case 'metadata': {
          return replyQuery(stateManager.getMetadata(data))
        }
        case 'call': {
          try {
            const options = JSON.parse(data)
            const result = await stateManager.callViewFunc(options.address, options.name, options.params, options.options)
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
      return { code: 1, info: String(error) }
    }
  }
}

function getTx(req) {
  let reqTx = codec.decode(req.tx)

  const tx = new Tx(
    reqTx.from,
    reqTx.to,
    parseFloat(reqTx.value) || 0,
    parseFloat(reqTx.fee) || 0,
    JSON.parse(reqTx.data || '{}'),
    reqTx.nonce)
  tx.setSignature(reqTx.signature)

  return tx
}

function replyQuery (data) {
  return { code: 0, info: JSON.stringify(data) }
}

const port = 26658
stateManager.loadState().then(() => {
  createABCIServer(handlers).listen(port, () => {
    console.log(`listening on port ${port}`)
  })
}).catch(error => {
  console.error(error)
})
