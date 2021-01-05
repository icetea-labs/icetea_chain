// A replacement for patricial with same interface and same backing DB
const { createTrie } = require('../trie')
const serializer = require('../state/serializer').getSerializer()
const rocksDB = require('../trie/rocksdb')
const config = require('../config')
const rootKey = 'rootKey'
const blockKey = 'blockKey'
const lastBlockKey = 'lastBlockKey'
const validatorsKey = 'validatorsKey'

let db

const patricia = () => {
  const rootHash = db.get(rootKey)
  return createTrie({ backingDb: db, rootHash })
}

const dump = (trie) => {
  return trie.walkTrie()
}

const lastBlock = () => {
  const value = db.get(lastBlockKey)
  const stringValue = value.toString()
  if (!stringValue) return null
  return serializer.deserialize(value)
}

exports.load = (path) => {
  db = rocksDB(path)
  const trie = patricia()
  const [state, block] = [dump(trie), lastBlock()]
  if (!block) {
    return null
  }
  const validators = this.getValidatorsByHeight(block ? block.number : 0)
  return { state, block, validators }
}

exports.root = async () => {
  const trie = patricia()
  return trie.rootHash
}

exports.getHash = (stateTable) => {
  const trie = createTrie({ backingDb: db })
  const opts = []
  Object.keys(stateTable).map(key => {
    opts.push({
      type: 'put',
      key,
      value: serializer.serialize(stateTable[key])
    })
  })
  return trie.batch(opts)
}

exports.save = ({ block, state, validators, commitKeys }) => {
  const trie = patricia()
  const opts = []
  const persistBlock = { ...block }
  commitKeys.forEach(key => {
    opts.push({
      type: 'put',
      key,
      value: serializer.serialize(state[key])
    })
  })
  // trie.checkpoint()
  trie.batch(opts)
  // trie.commit()
  db.put(rootKey, trie.root)
  persistBlock.stateRoot = trie.root
  db.put(`${blockKey}${block.number}`, serializer.serialize(persistBlock))
  if (block.number % config.election.epoch === 0) {
    db.put(`${validatorsKey}${block.number}`, serializer.serialize(validators))
  }
  db.put(lastBlockKey, serializer.serialize(persistBlock))
  return trie.root
}

exports.getBlockByHeight = async (height) => {
  const value = db.get(`${blockKey}${height}`)
  const stringValue = value.toString()
  if (!stringValue) {
    return null
  }
  return serializer.deserialize(value)
}

exports.getValidatorsByHeight = async (height) => {
  height = height - height % config.election.epoch
  const value = db.get(`${validatorsKey}${height}`)
  const stringValue = value.toString()
  if (!stringValue) {
    return []
  }
  return serializer.deserialize(value)
}

exports.getStateTable = async (stateRoot) => {
  const trie = createTrie({ backingDb: db, rootHash: stateRoot })
  return dump(trie)
}

exports.getStateByKey = (key, stateRoot) => {
  const trie = createTrie({ backingDb: db, rootHash: stateRoot })
  const value = trie.get(key)
  const stringValue = value.toString()
  if (!stringValue) {
    return null
  }
  return serializer.deserialize(value)
}
