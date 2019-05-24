const Trie = require('merkle-patricia-tree')
const async = require('async')
const newDB = require('./db')
const { serialize } = require('./utils')
const rootKey = 'rootKey'
const lastBlockKey = 'lastBlockKey'

let db

const patricia = () => {
  return new Promise((resolve, reject) => {
    db.get(rootKey, (err, value) => {
      if (err) {
        if (err.notFound) {
          return resolve(new Trie(db))
        }
        return reject(err)
      }
      return resolve(new Trie(db, Buffer.from(value, 'hex')))
    })
  })
}

const getState = (stateString) => {
  const state = JSON.parse(stateString)
  if (state.src && state.src.type === 'Buffer') {
    state.src = Buffer.from(state.src.data)
  }
  if (state.balance) {
    state.balance = BigInt(state.balance)
  }
  return state
}

const dump = (trie) => {
  return new Promise((resolve, reject) => {
    const state = {}
    const stream = trie.createReadStream()
    stream.on('data', function (d) {
      state[d.key.toString()] = getState(d.value.toString())
    })
    stream.on('end', function () {
      resolve(state)
    })
  })
}

const lastBlock = () => {
  return new Promise((resolve, reject) => {
    db.get(lastBlockKey, (err, value) => {
      if (err) {
        if (err.notFound) {
          return resolve(null)
        }
        return reject(err)
      }
      return resolve(JSON.parse(value.toString()))
    })
  })
}

exports.load = async (path) => {
  db = newDB(path)
  const trie = await patricia()
  const [state, block] = await Promise.all([dump(trie), lastBlock()])
  if (!block) {
    return null
  }
  return { state, block }
}

exports.root = async () => {
  const trie = await patricia()
  return trie.root.toString('hex')
}

exports.getHash = (stateTable) => {
  const trie = new Trie(db)
  const opts = []
  Object.keys(stateTable).map(key => {
    opts.push({
      type: 'put',
      key,
      value: serialize(stateTable[key])
    })
  })
  return new Promise((resolve, reject) => {
    trie.batch(opts, (err) => {
      if (err) {
        return reject(err)
      }
      return resolve(trie.root.toString('hex'))
    })
  })
}

exports.save = async ({ block, state, commitKeys }) => {
  const trie = await patricia()
  const opts = []
  commitKeys.forEach(key => {
    opts.push({
      type: 'put',
      key,
      value: serialize(state[key])
    })
  })
  return new Promise((resolve, reject) => {
    async.waterfall([
      (next) => {
        trie.batch(opts, next)
      },
      (next) => {
        trie.checkpoint()
        trie.commit(next)
      },
      (ret, next) => {
        db.put(rootKey, trie.root.toString('hex'), next)
      },
      (next) => {
        db.put(lastBlockKey, serialize(block), next)
      }
    ], (err, ret) => {
      if (err) {
        return reject(err)
      }
      return resolve(trie.root.toString('hex'))
    })
  })
}
