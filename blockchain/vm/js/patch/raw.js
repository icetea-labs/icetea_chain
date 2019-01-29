module.exports = src => `
const global = void 0, process = void 0, Date = void 0, Math = void 0,
    setInterval = void 0, setTimeout = void 0;
${src}
`