const { isAllZero, naiveHash } = require('./hash')
const rootKey = 'rootKey'

const range = (length, begin = 0) =>
  Array.from({ length }, (_, index) => begin + index)

const splitEvery = (input, chunkLength) =>
  range(Math.ceil(input.length / chunkLength))
    .map((index) => index * chunkLength)
    .map((begin) => input.slice(begin, begin + chunkLength))

// convert to bit field (not very optimal way)
const keyToPath = key => key.reduce((s, b) => {
  s += b.toString(2).padStart(8, '0')
  return s
}, '')

const pathToKey = path => Buffer.from(Uint8Array.from(
  splitEvery(path, 8).map((byteString) =>
    parseInt(byteString, 2)
  )
))

const shiftLeftPath = (path, from = 1) => {
  return path.slice(from) + '0'.repeat(from)
}

class Trie {
  rootHash

  // the backing DB, should support sync put and get
  backingDb

  // hash should be 256 bit size
  trieHash

  // used to hash the key to ensure randomized distribution
  keyHash

  zeroHash

  count
  // rootHash should be a buffer of 32 bytes
  constructor (rootHash, trieHash, backingDb, keyHash, count) {
    this.trieHash = trieHash
    this.backingDb = backingDb
    this.keyHash = keyHash
    this.rootHash = rootHash
    this.zeroHash = trieHash.zeroHash()
    this.count = count
  }

  getNode (hash) {
    const buf = this.trieHash.dehash(hash)
    if (buf === undefined) {
      // if it is not a shortcut, it must in backingDb
      return this.backingDb.get(hash)
    }
    return buf
  }

  put (key, value) {
    if (this.keyHash) {
      key = this.keyHash(key)
    }
    this.rootHash = this._put(this.rootHash, keyToPath(key), 0, value)
    this.backingDb.put(rootKey, this.rootHash)
    return this.rootHash
  }

  _put (root, path, depth, value) {
    let currentHash = root
    const nextPath = shiftLeftPath(path)
    if (depth === 256) {
      return value
    }
    // root hash is zero or hash of this subtree is zero
    // calculate hash from there then return
    if (isAllZero(currentHash)) {
      const hash = this.makeSingleKeyHash(path, depth, value)
      this.count.putDb += 1
      this.backingDb.put(hash, Buffer.concat([Buffer.from([depth]), pathToKey(path), Buffer.from(value)], 65))
      return hash
    }
    currentHash = this.backingDb.get(currentHash)
    if (currentHash.length === 65) {
      // reach here mean this subtree already have the value
      // get the path, value then calculate with new path, value to rehash
      const origpath = keyToPath(currentHash.slice(1, 33))
      const origvalue = currentHash.slice(33)
      return this.makeDoubleKeyHash(path, origpath, depth, value, origvalue.toString())
    } else if (path[0] === '1') {
      // reach here mean this subtree have multi value
      // slice the current hash, and recurse down
      const newHash = Buffer.concat([currentHash.slice(0, 32), this._put(currentHash.slice(32), nextPath, depth + 1, value)], 64)
      const hash = naiveHash(newHash)
      this.count.putDb += 1
      this.backingDb.put(hash, newHash)
      return hash
    } else {
      const newHash = Buffer.concat([this._put(currentHash.slice(0, 32), nextPath, depth + 1, value), currentHash.slice(32)], 64)
      const hash = naiveHash(newHash)
      this.count.putDb += 1
      this.backingDb.put(hash, newHash)
      return hash
    }
  }

  // Make a root hash of a (sub)tree with two key/value pairs, and save intermediate nodes in the DB
  makeDoubleKeyHash (path1, path2, depth, value1, value2) {
    let child
    const nextPath1 = shiftLeftPath(path1)
    const nextPath2 = shiftLeftPath(path2)

    if (depth === 256) {
      throw new Error('Cannot fit two values into one slot!')
    }
    if (path1[0] === '1') {
      // if path 2 go down same with path 1 ==> assume opposite path will be zero
      // hash one path then hash with zero hash to return the root hash
      if (path2[0] === '1') {
        const left = this.zeroHash
        const right = this.makeDoubleKeyHash(nextPath1,
          nextPath2, depth + 1, value1, value2)
        const child = Buffer.concat([left, right], 64)
        const { hash } = this.trieHash.hash(left, right, true, false)
        this.count.putDb += 1
        this.backingDb.put(hash, child)
        return hash
      } else {
        // if path 2 go down different with path 1 => hash left and right of deeper level
        // then hash left + right to calculate the root hash
        const left = this.makeSingleKeyHash(nextPath2, depth + 1, value2)
        const right = this.makeSingleKeyHash(nextPath1, depth + 1, value1)
        this.backingDb.put(left, Buffer.concat([Buffer.from([depth + 1]), pathToKey(nextPath2), Buffer.from(value2)], 65))
        this.backingDb.put(right, Buffer.concat([Buffer.from([depth + 1]), pathToKey(nextPath1), Buffer.from(value1)], 65))

        child = Buffer.concat([left, right], 64)
      }
    } else {
      if (path2[0] === '1') {
        const left = this.makeSingleKeyHash(nextPath1, depth + 1, value1)
        const right = this.makeSingleKeyHash(nextPath2, depth + 1, value2)
        this.backingDb.put(left, Buffer.concat([Buffer.from([depth + 1]), pathToKey(nextPath1), Buffer.from(value1)], 65))
        this.backingDb.put(right, Buffer.concat([Buffer.from([depth + 1]), pathToKey(nextPath2), Buffer.from(value2)], 65))
        child = Buffer.concat([left, right], 64)
      } else {
        const left = this.makeDoubleKeyHash(nextPath1,
          nextPath2, depth + 1, value1, value2)
        const right = this.zeroHash
        const child = Buffer.concat([left, right], 64)
        const { hash } = this.trieHash.hash(left, right, false, true)
        this.count.putDb += 1
        this.backingDb.put(hash, child)
        return hash
      }
    }
    const hash = naiveHash(child)
    this.count.putDb += 1
    this.backingDb.put(hash, child)
    return hash
  }

  // walk though tree from the depth, store value to node, then rehash to calculate the root hash
  // every updated of subtree have only one node will have length == 65. 1 for depth, 32 for path, 32 for value
  // so when get key, we can simple get depth of the key, then bitwise the path, and get only last 32 for the value to reduce the time read db
  makeSingleKeyHash (path, depth, value) {
    if (depth === 256) {
      return naiveHash(value)
    } else if (path[0] === '1') {
      const goRightHash = this.makeSingleKeyHash(shiftLeftPath(path), depth + 1, value)
      const { hash } = this.trieHash.hash(this.zeroHash, goRightHash, true, false)
      return hash
    } else {
      const goLeftHash = this.makeSingleKeyHash(shiftLeftPath(path), depth + 1, value)
      const { hash } = this.trieHash.hash(goLeftHash, this.zeroHash, false, true)
      return hash
    }
  }

  get (key) {
    if (this.keyHash) {
      key = this.keyHash(key)
    }
    let currentHash = this.rootHash
    const path = keyToPath(key)
    for (let i = 0; i < 255; i++) {
      if (currentHash === this.zeroHash) {
        this.count.getDb += 1
        return this.backingDb.get(currentHash)
      }
      this.count.getDb += 1
      const child = this.backingDb.get(currentHash)
      if (!child) {
        return this.zeroHash
      }
      if (child.length === 65) {
        if (shiftLeftPath(path, +child[0].toString()) === keyToPath(child.slice(1, 33))) {
          return child.slice(33)
        } else {
          return this.zeroHash
        }
      } else {
        if (path[i] === '1') {
          currentHash = child.slice(32)
        } else {
          currentHash = child.slice(0, 32)
        }
      }
    }
    return currentHash
  }
}

module.exports = { Trie }
