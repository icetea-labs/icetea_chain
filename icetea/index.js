const createABCIServer = require('abci')

const codec = require('./helper/codec')
const ecc = require('./helper/ecc')
const StateManager = require('./StateManager')
const ContractExecutor = require('./ContractExecutor')
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
      // verify signature
      ecc.verifyTxSignature(tx)

      // check balance, call type, etc.
      checkTx(tx, stateManager)

      // all checks pass, just return
      return {}
    } catch (err) {
      return { code: 1, log: String(err) }
    }
  },

  beginBlock (req) {
    const hash = req.hash.toString('hex')
    const number = req.header.height.toNumber()
    const timestamp = req.header.time.seconds.toNumber()
    stateManager.onNewBlock({ number, hash, timestamp })
    return {} // tags
  },

  async deliverTx (req) {
    try {
      const tx = getTx(req)

      const [data, tags] = await execTx(tx, stateManager)

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

  async commit () {
    return { data: await stateManager.saveState() } // return the block stateRoot
  },

  async query (req) {
    try {
      // console.log(req.path, req.data.toString(), req.prove || false);

      // TODO: handle replying merkle proof to client if requested

      // const prove = !!req.prove;

      const path = req.path
      const data = req.data.toString()

      const executor = new ContractExecutor(stateManager.stateTable, stateManager.lastBlock)

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
          return replyQuery(await executor.getMetadata(data))
        }
        case 'call': {
          try {
            const options = JSON.parse(data)
            const result = await executor.invokeView(options.address, options.name, options.params, options.options)
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

function checkTx (tx, stateManager) {
  return new ContractExecutor(stateManager.stateTable, stateManager.lastBlock).checkTx(tx)
}

function execTx (tx, stateManager) {
  return new ContractExecutor(stateManager.stateTable, stateManager.lastBlock).execTx(tx)
}

function getTx (req) {
  let reqTx = codec.decode(req.tx)

  return new Tx(
    reqTx.from,
    reqTx.to,
    reqTx.value,
    reqTx.fee,
    JSON.parse(reqTx.data || '{}'),
    reqTx.nonce).setSignature(reqTx.signature)
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
