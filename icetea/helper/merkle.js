
// We'll use a regular levelDB version first
// before trying to use AVL merkle trie in the future.
// In addition, for now, store only the last block's state => no support for history state

// const merk = require('merk')

const db = require('./db')
const { sha256 } = require('./codec')

// Store everything under one key
const KEY = 'key'

exports.load = () => {
  return new Promise((resolve, reject) => {
    db.get(KEY, (err, value) => {
      if (err) {
        if (err.notFound) {
          resolve(undefined)
        } else {
          reject(err)
        }
      }
      resolve(value)
    })
  })
}

exports.save = (data) => {
  return new Promise((resolve, reject) => {
    db.put(KEY, data, err => {
      reject(err)
    })
    // resolve(exports.getHash(data.state))
    resolve(data.state)
  })
}

exports.getHash = (message) => sha256(message)
