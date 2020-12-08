const serializer = require('../state/serializer').getSerializer()
const { MemDB } = require('./memdb')

const HASH_SIZE = 32

// convert to bit field (not very optimal way)
const keyToPath = key => key.reduce((s, b) => {
  s += b.toString(2).padStart(8, '0')
  return s
}, '')

class Trie {
    rootHash

    // the backing DB, should support sync put and get
    backingDb

    // hash should be 256 bit size
    trieHash

    // used to hash the key to ensure randomized distribution
    keyHash

    checkPoints

    mainDb

    memDb

    // rootHash should be a buffer of 32 bytes
    constructor (rootHash, trieHash, backingDb, keyHash) {
      this.rootHash = rootHash
      this.trieHash = trieHash
      this.backingDb = backingDb
      this.mainDb = backingDb
      this.keyHash = keyHash
      this.checkPoints = []
    }

    get duringCheckpoint () {
      return this.checkPoints.length > 0
    }

    get root () {
      return this.rootHash
    }

    // hash should be a buffer of 32 bytes
    getNode (hash) {
      const buf = this.trieHash.dehash(hash)
      if (buf === undefined) {
        // if it is not a shortcut, it must in backingDb
        return this.backingDb.get(hash)
      }

      return buf
    }

    dump () {
      this.backingDb.dump()
    }

    // key is a buffer of 256 bits (tx hash, block hash)
    // if it is not so, it should be hashed first (similar to 'secure' option of Pacitria)
    get (key) {
      if (this.keyHash) {
        key = this.keyHash(key)
      }
      const path = keyToPath(key)

      // navigate through the path
      let currentHash = this.rootHash
      const lastIndex = path.length - 1
      for (let i = 0; i <= lastIndex; i++) {
        const buf = this.getNode(currentHash)
        if (i === lastIndex) {
          // we are at leaf level, just return the value stored there
          return buf
        } else if (buf === 0) {
          // got zero at non-leaf => key not exsit
          return
        }

        // '0' => go left, '1' => go right
        if (path[i] === '0') {
          currentHash = buf.slice(0, HASH_SIZE)
        } else {
          currentHash = buf.slice(HASH_SIZE)
        }
      }
    }

    // key is a buffer of 256 bits (tx hash, block hash)
    // if it is not so, it should be hashed first (similar to 'secure' option of Pacitria)
    put (key, value) {
      if (this.keyHash) {
        key = this.keyHash(key)
      }
      const path = keyToPath(key)
      // navigate through the path
      let currentHash = this.rootHash
      const lastIndex = path.length - 1

      const pathHashes = []

      // we did not mutate zeroHash, so no need to create new for each loop
      const zeroBuf = this.trieHash.zeroHash()

      for (let i = 0; i <= lastIndex; i++) {
        if (i < lastIndex) {
          // We are en-route (not reach leaf yet)

          const buf = this.getNode(currentHash)
          const goLeft = path[i] === '0'
          const left = buf === 0 ? zeroBuf : buf.slice(0, HASH_SIZE)
          const right = buf === 0 ? zeroBuf : buf.slice(HASH_SIZE)
          pathHashes[i] = { goLeft, left, right }

          currentHash = goLeft ? left : right
        } else {
          // we reach leaf

          // update the leaf
          currentHash = this.trieHash.naiveHash(value)
          currentHash.writeUInt16BE(1, 0)
          this.backingDb.put(currentHash, value)
          // going back to update hashes
          for (let j = lastIndex - 1; j >= 0; j--) {
            // Go back one step
            // at this point
            const { goLeft, left, right } = pathHashes[j]

            // either left or right must has changed then we need to rehash
            const { hash, content, shortcut } = this.trieHash.hash(goLeft ? currentHash : left, goLeft ? right : currentHash)

            // if it is not shortcut (i.e. the content can't be derived from the hash itself)
            // we need to store the content in database
            if (!shortcut) {
              this.backingDb.put(hash, content)
            }

            // remember current hash for next loop
            currentHash = hash

            if (j === 0) {
              this.rootHash = hash
            }
          }
        }
      }
    }

    walkTrie (root) {
      const state = {}
      root = root || this.rootHash
      if (!root) {
        return
      }

      const path = keyToPath(root)

      // navigate through the path
      let currentHash = root
      const lastIndex = path.length - 1
      for (let i = 0; i <= lastIndex; i++) {
        const buf = this.getNode(currentHash)
        if (buf !== 0) {
          state[buf.key.toString()] = serializer.deserialize(buf.value)
        }

        // '0' => go left, '1' => go right
        if (path[i] === '0') {
          currentHash = buf.slice(0, HASH_SIZE)
        } else {
          currentHash = buf.slice(HASH_SIZE)
        }
      }
      return state
    }

    batch (ops) {
      for (const op of ops) {
        if (op.type === 'put') {
          if (!op.value) {
            throw new Error('Invalid batch db operation')
          }
          this.put(op.key, op.value)
        }
      }
    }

    // Creates a checkpoint that can later be reverted to or committed.
    // After this is called, no changes to the trie will be permanently saved until `commit` is called.
    checkpoint () {
      const wasCheckpoint = this.duringCheckpoint
      this.checkPoints.push(this.root)

      // Entering checkpoint mode is not necessary for nested checkpoints
      if (!wasCheckpoint && this.duringCheckpoint) {
        this.enterCpMode()
      }
    }

    enterCpMode () {
      this.memDb = new MemDB(this.backingDb)
      this.backingDb = this.memDb
    }

    // Creates a checkpoint that can later be reverted to or committed.
    // After this is called, no changes to the trie will be permanently saved until `commit` is called.
    commit () {
      if (!this.duringCheckpoint) {
        throw new Error('trying to commit when not checkpointed')
      }
      this.checkPoints.pop()
      if (!this.duringCheckpoint) {
        this.exitCpMode(true)
      }
    }

    exitCpMode (commitState) {
      const memDb = this.memDb
      this.memDb = null
      this.backingDb = this.mainDb

      if (commitState) {
        const entries = memDb.dump()
        const ops = []
        entries.forEach(([key, value]) => {
          ops.push({ type: 'put', key, value })
        })
        if (ops.length) {
          this.backingDb.batch(ops)
        }
      }
    }
}

module.exports = { Trie }
