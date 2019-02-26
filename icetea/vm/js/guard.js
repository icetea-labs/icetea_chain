const { codeFrameColumns } = require('@babel/code-frame')

const MAX_LOOP_ENTRIES = 100000
const MAX_FUNC_ENTRIES = 1000

function makeCodeFrame (src, line, ch) {
  return codeFrameColumns(src, { start: { line: line, column: ch } }, {
    highlightCode: true
  })
}

module.exports = () => src => {
  const loopEntries = {}
  const funcEntries = {}
  return Object.freeze({
    enterLoop (gid, line, ch) {
      loopEntries[gid] = (loopEntries[gid] || 0) + 1
      if (loopEntries[gid] > MAX_LOOP_ENTRIES) {
        throw new Error(`Too many loop re-entries.\n${makeCodeFrame(src, line, ch)}`)
      }
    },
    enterFunction (gid, line, ch) {
      funcEntries[gid] = (funcEntries[gid] || 0) + 1
      if (funcEntries[gid] > MAX_FUNC_ENTRIES) {
        throw new Error(`Too many function re-entries.\n${makeCodeFrame(src, line, ch)}`)
      }
    }
  })
}
