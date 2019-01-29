const check = require('./check');
const decorator = require('./decorator');
const meta = require('./meta');

module.exports = babel => [check(babel), decorator(babel), meta(babel)];