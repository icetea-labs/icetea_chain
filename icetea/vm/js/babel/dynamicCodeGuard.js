module.exports = () => {
  return {
    name: 'dynamic-code-guard',
    visitor: {
      Identifier (path) {
        if (path.node.name === 'constructor' && path.parent.type !== 'ClassMethod') {
          throw path.buildCodeFrameError('Access to constructor is not supported.')
        } else if (path.node.name === 'Function') {
          throw path.buildCodeFrameError('Running dynamic code at global scope is restricted.')
        }
      }
    }
  }
}
