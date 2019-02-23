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
    t.memberExpression(t.identifier('__guard'), t.identifier('enterLoop')),
    [t.stringLiteral(id.name), t.numericLiteral(line), t.numericLiteral(ch)]
  )
}

const protect = t => path => {
  let line = 1; let ch = 0
  if (path.node.loc) {
    line = path.node.loc.start.line
    ch = path.node.loc.start.column
  }
  const id = path.scope.generateUidIdentifierBasedOnNode(path.node.id)
  const inside = generateInside({ t, id, line, ch })
  const body = path.get('body')

  // if we have an expression statement, convert it to a block
  if (!t.isBlockStatement(body)) {
    body.replaceWith(t.blockStatement([body.node]))
  }
  body.unshiftContainer('body', inside)
}

module.exports = ({ types: t }) => {
  return {
    name: 'loop-entry-guard',
    visitor: {
      WhileStatement: protect(t),
      ForStatement: protect(t),
      DoWhileStatement: protect(t)
    }
  }
}
