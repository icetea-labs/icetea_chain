const all = require('./all')
const loop = require('../loopEntryGuard')
const func = require('../functionEntryGuard')

module.exports = babel => [loop(babel), func(babel), all(babel)]
