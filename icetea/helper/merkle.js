
// We'll use a regular levelDB version first
// before trying to use AVL merkle trie in the future.
// In addition, for now, store only the last block's state => no support for history state

//const merk = require('merk')

const db = require('./db')
const { sha256 } = require('./codec')

// Store everything under one key
const KEY = "key"

exports.load = () => {
    return new Promise((yes, no) => {
        db.get(KEY, (err, value) => {
            if (err) {
                if (err.notFound) {
                    yes({ state: {} })
                } else {
                    no(err)
                }
            }
            yes(value)
        })
    })
}

exports.save = (data) => {
    return new Promise((yes, no) => {
        db.put(KEY, data, err => {
            no(err)
        })
        yes(exports.getHash(data.state))
    })
}

exports.getHash = (stateTable) => sha256(stateTable)
