/** @module */
// We'll use a regular levelDB version first
// before trying to use AVL merkle trie in the future.
// In addition, for now, store only the last block's state => no support for history state

// const merk = require('merk')

const db = require('./db')
const { ecc } = require('icetea-common')
const stableHashObject = ecc.stableHashObject

// Store everything under one key
const KEY = 'key'

/**
 * load merkle state from db
 * @async
 * @function
 * @returns {Promise<object>} state object
 */
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

/**
 * save merkle state to db
 * @async
 * @function
 * @param {object} data object
 * @returns {Promise<object>} state object
 */
exports.save = (data) => {
  return new Promise((resolve, reject) => {
    db.put(KEY, data, err => {
      reject(err)
    })
    // resolve(exports.getHash(data.state))
    resolve(data.state)
  })
}

/**
 * get hash of a string
 * @function
 * @param {string} message message
 * @returns {string} hash
 */
exports.getHash = (message) => stableHashObject(message)
