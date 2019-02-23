
// Encapsulate DB logic here so we might change to other engines later

const level = require('level')
const codec = require('./codec')
module.exports = level('./state', { valueEncoding: {
  encode: codec.encode,
  decode: codec.decode,
  buffer: true,
  type: 'icetea-state-pack'
} })
