const assert = require('assert')
const { createTrie } = require('.')

const testBasic = () => {
  const trie = createTrie()
  const key1 = Buffer.from('key1')
  const value1 = Buffer.from('value1')
  console.log(trie.get(key1))
  assert.strictEqual(trie.get(key1), undefined)

  trie.put(key1, value1)
  assert.strictEqual(trie.get(key1).equals(value1), true)
}

testBasic()
