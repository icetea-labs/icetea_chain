const protect = t => path => {
  let { node } = path
  if (!node.expression || node.expression.type !== 'CallExpression') {
    return
  }
  const { expression } = node
  if (!expression.callee || expression.callee.type !== 'MemberExpression') {
    return
  }
  const { callee } = expression
  if (callee.object.type !== 'ThisExpression' || callee.property.name !== 'setState') {
    return
  }

  path.replaceWithMultiple([
    t.expressionStatement(t.callExpression(t.identifier('usestategas'), expression.arguments)),
    t.expressionStatement(
      t.callExpression(
        t.memberExpression(t.identifier('this'), t.identifier('setState')),
        expression.arguments
      )
    )
  ])
}

module.exports = ({ types: t }) => {
  return {
    name: 'state-guard',
    visitor: {
      ExpressionStatement: protect(t)
    }
  }
}
