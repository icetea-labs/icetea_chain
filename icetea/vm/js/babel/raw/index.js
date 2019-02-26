const loop = require('../loopEntryGuard')
const func = require('../functionEntryGuard')
module.exports = babel => [loop(babel), func(babel)]
