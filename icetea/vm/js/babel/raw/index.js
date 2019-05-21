const loop = require('../loopEntryGuard')
const func = require('../functionEntryGuard')
const dynamic = require('../dynamicCodeGuard')

module.exports = babel => [dynamic(babel), loop(babel), func(babel)]
