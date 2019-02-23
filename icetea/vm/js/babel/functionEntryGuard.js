// protect function from too-many re-entries (recursive)

// protect loops from infinite or too-many re-entries
// Based on jsbin loop protect (https://github.com/jsbin/loop-protect)

/*

before:
====
n = 0;
while(n++ < 100000000) {
    doSomething();
}

after:
===
n = 0;
while(n++ < 100000000) {
    __guard.enterLoop(uid, row, column);
    doSomething();
}

Note: it does not report line number, since we do not map to original line number yet
(maybe use map file or recast later on)

*/

const generateInside = ({ t, id, line, ch }) => {
  return t.callExpression(
    t.memberExpression(t.identifier('__guard'), t.identifier('enterFunction')),
    [t.stringLiteral(id.name), t.numericLiteral(line), t.numericLiteral(ch)]
  )
}

const protect = t => path => {
  let line = 0; let ch = 0
  if (path.node.loc) {
    line = path.node.loc.start.line
    ch = path.node.loc.start.column
  }
  const id = path.scope.generateUidIdentifierBasedOnNode(path.node.id)
  const inside = generateInside({ t, id, line, ch })
  const body = path.get('body')

  // It is not possible to re-entry for literal function
  if (body.isLiteral()) return

  // if we have an expression statement, convert it to a block
  if (!t.isBlockStatement(body)) {
    try {
      body.replaceWith(t.blockStatement([body.node]))
    } catch (err) {
      body.replaceWith(t.blockStatement([t.returnStatement(body.node)]))
    }
  } else if (!body.node.body.length) {
    return
  }
  body.unshiftContainer('body', inside)
}

module.exports = ({ types: t }) => {
  return {
    name: 'function-entry-guard',
    visitor: {
      FunctionDeclaration: protect(t),
      FunctionExpression: protect(t),
      ArrowFunctionExpression: protect(t),
      ObjectMethod: protect(t),
      ClassMethod: protect(t)
    }
  }
}
