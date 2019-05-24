/** @module */
// Encapsulate DB logic here so we might change to other engines later

const level = require('level')

let instance
/**
 * return a leveldb object
 */
module.exports = (path = './state') => {
  if (!instance) {
    instance = level(path)
  }
  return instance
}
