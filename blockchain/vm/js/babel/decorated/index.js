const check = require('./check');
const loop = require('./loopEntryGuard');
const func = require('./functionEntryGuard');
const decorator = require('./decorator');
const meta = require('./meta');

module.exports = babel => [check(babel), loop(babel), func(babel), decorator(babel), meta(babel)];