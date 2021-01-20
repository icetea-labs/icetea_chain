const { Trie } = require('./trie')
const trieHash = require('./hash')
const { MemDB } = require('../memdb')

exports.createOptimizedTrie = ({ rootHash, backingDb, count } = {}) => {
  backingDb = backingDb || new MemDB()
  const trie = new Trie(rootHash, trieHash, backingDb, trieHash.naiveHash, count)
  return trie
}
