const RocksDB = require('rocksdb')

let instance
/**
 * return a leveldb object
 */
module.exports = (path = './state') => {
  if (!instance) {
    instance = new RocksDB(path)
    if (instance.status !== 'open') {
      instance.open()
    }
  }
  return instance
}
