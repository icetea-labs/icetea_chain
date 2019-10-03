const Trie = require('merkle-patricia-tree')
const serializer = require('../state/serializer').getSerializer()
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
      return resolve(new Trie(db, value))
    })
  })
}

const dump = (trie) => {
  return new Promise((resolve, reject) => {
    const state = {}
    const stream = trie.createReadStream()
    stream.on('data', function (d) {
      state[d.key.toString()] = serializer.deserialize(d.value)
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
      return resolve(serializer.deserialize(value))
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
  const validators = await this.getValidatorsByHeight(block ? block.number : 0)
  return { state, block, validators }
}

exports.root = async () => {
  const trie = await patricia()
  return trie.root
}

exports.getHash = (stateTable) => {
  const trie = new Trie(db)
  const opts = []
  Object.keys(stateTable).map(key => {
    opts.push({
      type: 'put',
      key,
      value: serializer.serialize(stateTable[key])
    })
  })
  return new Promise((resolve, reject) => {
    trie.batch(opts, (err) => {
      if (err) {
        return reject(err)
      }
      return resolve(trie.root)
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
      value: serializer.serialize(state[key])
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
        db.put(rootKey, trie.root, next)
      },
      (next) => {
        persistBlock.stateRoot = trie.root
        db.put(`${blockKey}${block.number}`, serializer.serialize(persistBlock), next)
      },
      (next) => {
        if (block.number % config.election.epoch !== 0) {
          return next(null)
        }
        db.put(`${validatorsKey}${block.number}`, serializer.serialize(validators), next)
      },
      (next) => {
        db.put(lastBlockKey, serializer.serialize(persistBlock), next)
      }
    ], (err, ret) => {
      if (err) {
        return reject(err)
      }
      return resolve(trie.root)
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
      return resolve(serializer.deserialize(value))
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
      return resolve(serializer.deserialize(value))
    })
  })
}

exports.getStateTable = async (stateRoot) => {
  const trie = new Trie(db, stateRoot)
  return dump(trie)
}

exports.getStateByKey = (key, stateRoot) => {
  const trie = new Trie(db, stateRoot)
  return new Promise((resolve, reject) => {
    trie.get(key, (err, value) => {
      if (err) {
        if (err.notFound) {
          return resolve(null)
        }
        return reject(err)
      }
      return resolve(serializer.deserialize(value))
    })
  })
}
