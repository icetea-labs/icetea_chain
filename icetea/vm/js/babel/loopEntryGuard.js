/** @module */

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
const template = require('@babel/template')
const { CostTable } = require('../gascost')

const generateInside = ({ t, id, line, ch, gas }) => {
  return t.blockStatement([
    t.expressionStatement(t.callExpression(
      t.memberExpression(t.identifier('__guard'), t.identifier('enterLoop')),
      [t.stringLiteral(id.name), t.numericLiteral(line), t.numericLiteral(ch)]
    )),
    t.expressionStatement(t.callExpression(
      t.memberExpression(t.identifier('__guard'), t.identifier('usegas')),
      [t.numericLiteral(gas)]
    ))
  ])
}

const _protect = (t, path) => {
  let line = 1; let ch = 0
  if (path.node.loc) {
    line = path.node.loc.start.line
    ch = path.node.loc.start.column
  }
  const id = path.scope.generateUidIdentifierBasedOnNode(path.node.id)
  const inside = generateInside({ t, id, line, ch, gas: CostTable.EnterLoop })
  const body = path.get('body')

  // if we have an expression statement, convert it to a block
  if (!t.isBlockStatement(body)) {
    body.replaceWith(t.blockStatement([body.node]))
  }
  body.unshiftContainer('body', inside)
}

const protect = t => path => {
  _protect(t, path)
}

const callExpression = t => path => {
  const { node } = path
  if (!node.callee || node.callee.type !== 'MemberExpression') {
    return
  }
  const { property } = node.callee
  if (!property || property.type !== 'Identifier' || !([
    'map', 'filter', 'reduce', 'forEach', 'every', 'some'
  ].includes(property.name))) {
    return
  }

  if (node.arguments.length === 0) {
    return
  }

  const arg = node.arguments[0]
  if (!['ArrowFunctionExpression', 'FunctionExpression'].includes(arg.type)) {
    return
  }

  if (arg.body.type !== 'BlockStatement') {
    const fn = template.smart(`
      {
        return VAR
      }
    `)
    arg.body = fn({
      VAR: arg.body
    })
  }

  _protect(t, path.get('arguments')[0])
}

/**
 * loop entry guard
 * @function
 * @param {object} options - options
 * @returns {object} loop entry guard
 */
module.exports = ({ types: t }) => {
  return {
    name: 'loop-entry-guard',
    visitor: {
      ForStatement: protect(t),
      ForOfStatement: protect(t),
      ForInStatement: protect(t),
      WhileStatement: protect(t),
      DoWhileStatement: protect(t),
      CallExpression: callExpression(t)
    }
  }
}
