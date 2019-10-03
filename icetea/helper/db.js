/** @module */
// Encapsulate DB logic here so we might change to other engines later

// const level = require('level')

const levelup = require('levelup')
const leveldown = require('leveldown')

let instance
/**
 * return a leveldb object
 */
module.exports = (path = './state') => {
  if (!instance) {
    // instance = level(path)
    instance = levelup(leveldown(path))
  }
  return instance
}
