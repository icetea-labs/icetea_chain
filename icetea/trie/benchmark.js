const { createTrie } = require('./index')

const { createOptimizedTrie } = require('./optimized')
const { MemDB } = require('./memdb')

const zeroHash = (size = 32) => Buffer.alloc(size)

const benchMark = () => {
  const dbtrie = new MemDB()
  const count = { putDb: 0, getDb: 0 }
  const trie = createTrie({ rootHash: zeroHash(), backingDb: dbtrie, count })

  const startTrie = Date.now()
  for (let i = 0; i < 100; i++) {
    trie.put(`test${i}`, `test${i}`)
  }
  const endTrie = Date.now()
  const diffPutTrie = (endTrie - startTrie) / 1000 % 60
  console.log('putTrietime', diffPutTrie)
  console.log('countTrie', count)

  const startGetTrie = Date.now()
  for (let i = 0; i < 100; i++) {
    trie.get(`test${i}`)
  }
  const endGetTrie = Date.now()
  const diffGetTrie = (endGetTrie - startGetTrie) / 1000 % 60
  console.log('getTrietime', diffGetTrie)
  console.log('countTrie', count)

  // optimized trie
  const dbOptimizedTrie = new MemDB()
  const countOptimized = { putDb: 0, getDb: 0 }
  const optimizedTrie = createOptimizedTrie({ rootHash: zeroHash(), backingDb: dbOptimizedTrie, count: countOptimized })
  const startPutOptimizedTrie = Date.now()
  for (let i = 0; i < 100; i++) {
    // console.log('updated', i)
    optimizedTrie.put(`test${i}`, `test${i}`)
  }
  const endPutOptimizedTrie = Date.now()
  const diffPutOptimizedTrie = (endPutOptimizedTrie - startPutOptimizedTrie) / 1000 % 60
  console.log('putOptimizedTrieTime', diffPutOptimizedTrie)
  console.log('countOptimized', countOptimized)

  const startGetOptimizedTrie = Date.now()
  for (let i = 0; i < 100; i++) {
    optimizedTrie.get(`test${i}`)
  }
  const endGetOptimizedTrie = Date.now()
  const diffGetOptimizedTrie = (endGetOptimizedTrie - startGetOptimizedTrie) / 1000 % 60
  console.log('getOptimizedTrieTime', diffGetOptimizedTrie)
  console.log('countOptimized', countOptimized)
}

benchMark()
