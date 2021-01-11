const HASH_LENGTH = 32
const HASH_ENCODING = 'base64'

exports.packTxHashes = txHashes => {
  const buf = Buffer.allocUnsafe(txHashes.length * HASH_LENGTH)
  let start = 0
  txHashes.forEach(h => {
    Buffer.from(h, HASH_ENCODING).copy(buf, start)
    start += HASH_LENGTH
  })

  return buf
}

exports.unpackTxHashes = buf => {
  const num = buf.length / HASH_LENGTH
  const txHashes = []
  let start = 0
  for (let i = 0; i < num; i++) {
    txHashes.push(buf.slice(start, start + HASH_LENGTH).toString(HASH_ENCODING))
    start += HASH_LENGTH
  }
  return txHashes
}
