const loop = require('../loopEntryGuard')
const func = require('../functionEntryGuard')
const state = require('../stateGuard')
const dynamic = require('../dynamicCodeGuard')

module.exports = babel => [dynamic(babel), loop(babel), func(babel), state(babel)]
