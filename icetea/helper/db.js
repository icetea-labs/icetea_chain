/** @module */
// Encapsulate DB logic here so we might change to other engines later

const level = require('level')

/**
 * return a leveldb object
 */
module.exports = level('./state')
