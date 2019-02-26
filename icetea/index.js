const createABCIServer = require('abci')

const codec = require('./helper/codec')

const Worker = require('./Worker')
const Tx = require('./Tx')

const worker = new Worker()

// turn on debug logging
// require('debug').enable('abci*')

const handlers = {

  info (req) {
    return Object.assign({
      data: 'icetea',
      version: '0.0.1',
      appVerion: '0.0.1'
    }, worker.info())
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
      worker.checkTx(tx)
      return {}
    } catch (err) {
      return { code: 1, log: String(err) }
    }
  },

  beginBlock (req) {
    const hash = req.hash.toString('hex')
    const number = req.header.height.toNumber()
    console.log('beginblock', number)
    const timestamp = req.header.time.seconds.toNumber()
    worker.beginBlock({ number, hash, timestamp })
    return {} // tags
  },

  async deliverTx (req) {
    let reqTx = codec.decode(req.tx)
    // console.log("deliverTx", reqTx);

    const tx = new Tx(
      reqTx.from,
      reqTx.to,
      parseFloat(reqTx.value) || 0,
      parseFloat(reqTx.fee) || 0,
      JSON.parse(reqTx.data || '{}'),
      reqTx.nonce)
    tx.setSignature(reqTx.signature)

    try {
      worker.verifyTx(tx)
      const [data, tags] = await worker.execTx(tx)
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

  endBlock (...args) {
    // console.log("endBlock", ...args);
    return {}
  },

  async commit (req) {
    console.log('commit', req)
    return { data: await worker.commit() } // return the block stateRoot
  },

  async query (req) {
    try {
      // console.log(req.path, req.data.toString(), req.prove || false);

      // const prove = !!req.prove;
      const path = req.path
      const data = req.data.toString()

      switch (path) {
        case 'balance':
          return replyQuery({
            balance: worker.balanceOf(data)
          })
        case 'state':
          return replyQuery(worker)
        case 'contracts':
          return replyQuery(worker.getContractAddresses())
        case 'metadata': {
          return replyQuery(worker.getMetadata(data))
        }
        case 'call': {
          try {
            const options = JSON.parse(data)
            const result = await worker.callViewFunc(options.address, options.name, options.params, options.options)
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

function replyQuery (data) {
  return { code: 0, info: JSON.stringify(data) }
}

const port = 26658
worker.loadState().then(() => {
  createABCIServer(handlers).listen(port, () => {
    console.log(`listening on port ${port}`)
  })
}).catch(error => {
  console.error(error)
})
