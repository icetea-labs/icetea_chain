
// Encapsulate codec logic here so we might change from msgpack to
// others (protobuf3, amino, bson, RLP) if desired

const msgpack = require('msgpack-lite')
const json = require('deterministic-json')
const { createHash } = require('crypto')

exports.encode = msgpack.encode
exports.decode = msgpack.decode

exports.stringify = json.stringify
exports.parse = json.parse

exports.sha256 = (content, enc) => {
  if (typeof content !== 'string') {
    content = json.stringify(content)
  }
  const hash = createHash('sha256').update(content)
  if (enc) {
    return hash.digest(enc) // Text
  }
  return hash.digest() // Buffer
}
