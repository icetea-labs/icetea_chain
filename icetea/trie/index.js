const { Trie } = require('./trie')
const trieHash = require('./hash')
const { MemDB } = require('./memdb')

exports.createTrie = rootHash => {
  const backingDb = new MemDB()
  const trie = new Trie(rootHash, trieHash, backingDb, trieHash.naiveHash)
  return trie
}
