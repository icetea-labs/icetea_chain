module.exports = src => `
'use strict';
const global = {}, globalThis = {}, process = void 0, Date = void 0, Math = void 0,
    setInterval = void 0, setTimeout = void 0, setImmediate = void 0;
const require = void 0;
return ${src}
`
