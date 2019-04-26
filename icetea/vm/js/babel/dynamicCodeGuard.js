module.exports = () => {
  return {
    name: 'dynamic-code-guard',
    visitor: {
      Identifier (path) {
        const name = path.node.name
        if (name === 'constructor' && path.parent.type !== 'ClassMethod') {
          throw path.buildCodeFrameError('Access to constructor is not supported.')
        } else if (name === 'Function') {
          throw path.buildCodeFrameError('Running dynamic code at global scope is restricted.')
        } else if (['__sysdate', '__systhis', '__g'].includes(name)) {
          throw path.buildCodeFrameError(`Access to reserved words ${name}`)
        }
      }
    }
  }
}
