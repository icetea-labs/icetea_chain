const HASH_SIZE = 32

// convert to bit field (not very optimal way)
const keyToPath = key => key.reduce((s, b) => {
  s += b.toString(2).padStart(8, '0')
  return s
}, '')

class Trie {
    rootHash

    // the backing DB should support sync put and get
    backingDb

    // hash should be 256 bit size
    trieHash

    // rootHash should be a buffer of 32 bytes
    constructor (rootHash) {
      this.rootHash = rootHash
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

    // key is a buffer of 256 bits (tx hash, block hash)
    // if it is not so, it should be hashed first (similar to 'secure' option of Pacitria)
    get (key) {
      const path = keyToPath(key)

      // navigate through the path
      let currentHash = this.rootHash
      const lastIndex = path.length - 1
      for (let i = 0; i <= lastIndex; i++) {
        const buf = this.getNode(currentHash)
        if (i === lastIndex) {
          // we are at leaf level, just return the value stored there
          return buf
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
      const path = keyToPath(key)

      // navigate through the path
      let currentHash = this.rootHash
      const lastIndex = path.length - 1

      const pathHashes = []

      for (let i = 0; i <= lastIndex; i++) {
        if (i === lastIndex) {
          // we are at leaf level, let's update the node
          this.backingDb.put(currentHash, value)

          // going back to update hashes
          for (let j = lastIndex - 1; j >= 0; j--) {
            // Go back one step
            // at this point, we should have old pair
            // and we should know that 'value' is right or left
            const { goLeft, left, right } = pathHashes[i]

            // then we do a trieHash.hash() of the pair
            const { hash, shortcut } = this.trieHash.hash(goLeft ? value : left, goLeft ? right : value)

            // then we set the position's hash to the new hash
            // (that might cause an update to DB only if required)
            if (goLeft) {

            } else {

            }
            if (!shortcut) {
              this.backingDb.put(hash, value)
            }

            // then we go up one step
            // at this time, the lash hash become value
            // so, we'll need
            // - store left, right, route of every step
            // - write an putNode function that will put into DB only when needed
            // that is all (sizzzzzz)
          }
        } else {
          const buf = this.getNode(currentHash)
          // '0' => go left, '1' => go right
          const goLeft = path[i] === '0'
          const left = buf.slice(0, HASH_SIZE)
          const right = buf.slice(HASH_SIZE)
          pathHashes[i] = { hash: currentHash, goLeft, left, right }

          currentHash = goLeft ? left : right
        }
      }
    }
}

module.exports = { Trie }
