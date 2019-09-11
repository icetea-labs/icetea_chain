const Trie = require('merkle-patricia-tree')
const v8 = require('v8')
const async = require('async')
const newDB = require('./db')
const config = require('../config')
const rootKey = 'rootKey'
const blockKey = 'blockKey'
const lastBlockKey = 'lastBlockKey'
const validatorsKey = 'validatorsKey'

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

const getState = (stateBuffer) => {
  const state = v8.deserialize(stateBuffer)
  return state
}

const dump = (trie) => {
  return new Promise((resolve, reject) => {
    const state = {}
    const stream = trie.createReadStream()
    stream.on('data', function (d) {
      state[d.key.toString()] = getState(d.value)
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
      value = Buffer.from(JSON.parse(value).data)
      return resolve(v8.deserialize(value))
    })
  })
}

exports.load = async (path) => {
  db = newDB(path)
  const trie = await patricia()
  const [state, block] = await Promise.all([dump(trie), lastBlock()])
  const validators = await this.getValidatorsByHeight(block ? block.number : 0)
  if (!block) {
    return null
  }
  return { state, block, validators }
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
      value: v8.serialize(stateTable[key])
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

exports.save = async ({ block, state, validators, commitKeys }) => {
  const trie = await patricia()
  const opts = []
  const persistBlock = { ...block }
  commitKeys.forEach(key => {
    opts.push({
      type: 'put',
      key,
      value: v8.serialize(state[key])
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
        persistBlock.stateRoot = trie.root.toString('hex')
        db.put(`${blockKey}${block.number}`, JSON.stringify(v8.serialize(persistBlock)), next)
      },
      (next) => {
        if (block.number % config.election.epoch !== 0) {
          return next(null)
        }
        db.put(`${validatorsKey}${block.number}`, JSON.stringify(v8.serialize(validators)), next)
      },
      (next) => {
        db.put(lastBlockKey, JSON.stringify(v8.serialize(persistBlock)), next)
      }
    ], (err, ret) => {
      if (err) {
        return reject(err)
      }
      return resolve(trie.root.toString('hex'))
    })
  })
}

exports.getBlockByHeight = async (height) => {
  return new Promise((resolve, reject) => {
    db.get(`${blockKey}${height}`, (err, value) => {
      if (err) {
        if (err.notFound) {
          return resolve(null)
        }
        return reject(err)
      }
      value = Buffer.from(JSON.parse(value).data)
      return resolve(v8.deserialize(value))
    })
  })
}

exports.getValidatorsByHeight = async (height) => {
  height = height - height % config.election.epoch
  return new Promise((resolve, reject) => {
    db.get(`${validatorsKey}${height}`, (err, value) => {
      if (err) {
        if (err.notFound) {
          return resolve([])
        }
        return reject(err)
      }
      value = Buffer.from(JSON.parse(value).data)
      return resolve(v8.deserialize(value))
    })
  })
}

exports.getStateTable = async (stateRoot) => {
  const trie = new Trie(db, Buffer.from(stateRoot, 'hex'))
  return dump(trie)
}

exports.getStateByKey = (key, stateRoot) => {
  const trie = new Trie(db, Buffer.from(stateRoot, 'hex'))
  return new Promise((resolve, reject) => {
    trie.get(key, (err, value) => {
      if (err) {
        if (err.notFound) {
          return resolve(null)
        }
        return reject(err)
      }
      return resolve(v8.deserialize(value))
    })
  })
}
