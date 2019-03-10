/*
function isPublic(type) {
    return ["ClassMethod", "ClassProperty"].includes(type);
}
function isPrivate(type) {
    return ["ClassPrivateMethod", "ClassPrivateProperty"].includes(type);
}
function isClassProperty(type) {
  return ["ClassProperty", "ClassPrivateProperty"].includes(type);
}
*/

function isMethod (node) {
  // console.log(mp);
  if (!node) return false
  const type = node.type
  if (type === 'ClassMethod' || type === 'ClassPrivateMethod') {
    return true
  }

  // check if value is a function or arrow function
  const valueType = node.value && node.value.type
  return valueType === 'FunctionExpression' ||
    valueType === 'ArrowFunctionExpression'
}

function buildError (message, nodePath) {
  if (nodePath && nodePath.buildCodeFrameError) {
    throw nodePath.buildCodeFrameError('State mutability decorators cannot be attached to variables')
  }

  throw new SyntaxError(message)
}

const KNOWN_FLOW_TYPES = ['number', 'string', 'boolean', 'bigint', 'null', 'undefined']

function concatUnique (a, b) {
  if (!Array.isArray(a)) {
    a = [a]
  }
  if (!Array.isArray(b)) {
    b = [b]
  }
  const result = a.concat(b.filter(i => !a.includes(i)))

  for (let i = 0; i < result.length; i++) {
    if (!KNOWN_FLOW_TYPES.includes(result[i])) {
      return 'any'
    }
  }

  if (result.length === 1) {
    return result[0]
  }

  return result
}

function getTypeName (node, insideUnion) {
  if (!node) return 'any'
  const ta = insideUnion ? node : node.typeAnnotation
  const tn = ta.type
  if (!tn) return 'any'

  let result
  if (tn === 'Identifier') {
    result = ta.name
  } else if (!tn.endsWith('TypeAnnotation')) {
    result = tn.toLowerCase()
  } else {
    result = tn.slice(0, tn.length - 14).toLowerCase()
  }

  // sanitize result

  if (result === 'void') {
    result = 'undefined'
  } else if (result === 'nullliteral') {
    result = 'null'
  } else if (result === 'generic') {
    result = ['undefined', 'bigint'].includes(ta.id.name) ? ta.id.name : 'any'
  } else if (result === 'nullable') {
    result = concatUnique(['undefined', 'null'], getTypeName(ta))
  } else if (result === 'union') {
    result = []
    ta.types.forEach(ut => {
      result = concatUnique(result, getTypeName(ut, true))
    })
  } else if (!KNOWN_FLOW_TYPES.includes(result)) {
    result = 'any'
  }
  return result !== 'any' && Array.isArray(result) ? result : [result]
}

function wrapState (t, item, memberMeta) {
  const name = item.node.key.name || ('#' + item.node.key.id.name)
  const initVal = item.node.value
  const getState = t.identifier('getState')
  const thisExp = t.thisExpression()
  const memExp = t.memberExpression(thisExp, getState)
  const callExpParams = [t.stringLiteral(name)]
  // if (initVal) callExpParams.push(initVal);
  const callExp = t.callExpression(memExp, callExpParams)
  const getter = t.classMethod('get', t.identifier(name), [],
    t.blockStatement([t.returnStatement(callExp)]))

  const setMemExp = t.memberExpression(thisExp, t.identifier('setState'))
  const setCallExp = t.callExpression(setMemExp, [t.stringLiteral(name), t.identifier('value')])
  const setter = t.classMethod('set', t.identifier(name), [t.identifier('value')],
    t.blockStatement([t.expressionStatement(setCallExp)]))

  // replace @state instance variable with a pair of getter and setter
  item.replaceWithMultiple([getter, setter])

  // if there's initializer, move it into constructor
  if (initVal) {
    let deployer = item.parent.body.find(p => p.key.name === '__on_deployed')

    // if no constructor, create one
    if (!deployer) {
      deployer = t.classMethod('method', t.identifier('__on_deployed'), [], t.blockStatement([]))
      item.parent.body.unshift(deployer)
      memberMeta['__on_deployed'] = {
        mp: { node: deployer },
        type: deployer.type,
        decorators: ['payable']
      }
    }

    // create a this.item = initVal;
    const setExp = t.memberExpression(thisExp, t.identifier(name))
    var assignState = t.expressionStatement(t.assignmentExpression('=', setExp, initVal))
    deployer.body.body.unshift(assignState)
  }
}

function astify (t, literal) {
  if (literal === null) {
    return t.nullLiteral()
  }
  switch (typeof literal) {
    case 'function':
      throw new Error('Not support function')
    case 'number':
      return t.numericLiteral(literal)
    case 'string':
      return t.stringLiteral(literal)
    case 'boolean':
      return t.booleanLiteral(literal)
    case 'undefined':
      return t.unaryExpression('void', t.numericLiteral(0), true)
    default:
      if (Array.isArray(literal)) {
        return t.arrayExpression(literal.map(m => astify(t, m)))
      }
      return t.objectExpression(Object.keys(literal)
        .filter((k) => {
          return /* !SPECIAL_MEMBERS.includes(k) && !k.startsWith('#') && */ typeof literal[k] !== 'undefined'
        })
        .map((k) => {
          return t.objectProperty(
            t.stringLiteral(k),
            astify(t, literal[k])
          )
        }))
  }
}

const SYSTEM_DECORATORS = ['state', 'onReceived', 'transaction', 'view', 'pure', 'payable']
const STATE_CHANGE_DECORATORS = ['transaction', 'view', 'pure', 'payable']
// const SPECIAL_MEMBERS = ['constructor', '__on_deployed', '__on_received']

module.exports = function ({ types: t }) {
  let contractName = null
  return {
    visitor: {
      Decorator (path) {
        const decoratorName = path.node.expression.name
        if (decoratorName === 'contract') {
          if (path.parent.type === 'ClassDeclaration') {
            if (contractName && contractName !== path.parent.id.name) {
              throw buildError('More than one class marked with @contract. Only one is allowed.', path)
            }
            contractName = path.parent.id.name

            // process constructor

            const m = path.parent.body.body.find(n => n.kind === 'constructor')
            if (m) {
              m.kind = 'method'
              m.key.name = '__on_deployed'
            }

            // Collect member metadata

            const memberMeta = {}

            const members = path.parentPath.get('body.body')
            // console.log(members);
            members.forEach(mp => {
              const m = mp.node
              // console.log(mp);

              const propName = m.key.name || ('#' + m.key.id.name)
              memberMeta[propName] = {
                mp,
                type: m.type,
                decorators: []
              }

              // process decorators
              const mds = mp.get('decorators')
              if (mds && mds.length) {
                mds.forEach(dp => {
                  const d = dp.node
                  const dname = d.expression.name

                  memberMeta[propName].decorators.push(dname)

                  if (dname === 'state') {
                    if (isMethod(m)) {
                      throw buildError('Class method cannot be decorated as @state', mp)
                    }
                    wrapState(t, mp, memberMeta)
                  } else if (dname === 'onReceived') {
                    // const newNode = t.classProperty(t.identifier('__on_received'),
                    //   t.memberExpression(t.thisExpression(), t.identifier(propName)))
                    // path.parent.body.body.push(newNode)
                    // memberMeta['__on_received'] = {
                    //   mp: {node: newNode},
                    //   type: newNode.type,
                    //   decorators: []
                    // }
                    memberMeta['__on_received'] = propName
                  }

                  if (SYSTEM_DECORATORS.includes(dname)) dp.remove()
                })
              }

              // process type annotation
              if (typeof memberMeta[propName] === 'string') {
                // link to other method, like __on_received => @onReceived. No handle.
              } if (!isMethod(m)) {
                memberMeta[propName].fieldType = getTypeName(m.typeAnnotation)
              } else {
                const fn = m.value || m
                memberMeta[propName].returnType = getTypeName(fn.returnType)
                memberMeta[propName].params = []
                // process parameters
                fn.params.forEach(p => {
                  const item = p.left || p
                  const param = {
                    name: item.name,
                    type: getTypeName(item.typeAnnotation)
                  }
                  if (p.right) {
                    if (t.isNullLiteral(p.right)) {
                      param.defaultValue = null
                    } else if (t.isLiteral(p.right)) {
                      param.defaultValue = p.right.value
                    }
                  }
                  memberMeta[propName].params.push(param)
                })
              }
            })

            // console.log(memberMeta)

            // validate metadata

            Object.keys(memberMeta).forEach(key => {
              if (typeof memberMeta[key] !== 'string') {
                const stateDeco = memberMeta[key].decorators.filter(e => STATE_CHANGE_DECORATORS.includes(e))
                // const isState = memberMeta[key].decorators.includes("state");
                const mp = memberMeta[key].mp
                delete memberMeta[key].mp
                if (!isMethod(mp.node)) {
                  if (stateDeco.length) {
                    console.log(key)
                    throw buildError('State mutability decorators cannot be attached to variables', mp)
                  } else {
                    if (memberMeta[key].decorators.includes('state')) {
                      memberMeta[key].decorators.push('view')
                    } else {
                      memberMeta[key].decorators.push('pure')
                    }
                  }
                } else if (key.startsWith('#') && stateDeco.includes('payable')) {
                  throw buildError('Private function cannot be payable', mp)
                } else {
                  if (!stateDeco.length) {
                    // default to view
                    memberMeta[key].decorators.push('view')
                  } else if (stateDeco.length > 1) {
                    throw buildError(`Could not define multiple state mutablility decorators: ${stateDeco.join(', ')}`, mp)
                  }
                }
              }
            })

            // add to __metadata
            // console.log(astify(t, memberMeta))

            const program = path.findParent(p => p.isProgram())
            const metaDeclare = program.get('body').find(p => p.isVariableDeclaration() && p.node.declarations[0].id.name === '__metadata')
            if (metaDeclare) {
              metaDeclare.node.declarations[0].init = astify(t, memberMeta)
            }
          }
          path.remove()
        }
      },
      NewExpression (path) {
        const calleeName = path.node.callee.name
        if (calleeName === 'Function') {
          throw buildError('Running dynamic code at global scope is restricted.', path)
        }
      },
      Identifier (path) {
        if (path.node.name === '__contract_name') {
          if (!contractName) {
            throw buildError('Must have one class marked @contract.', path)
          }
          path.node.name = contractName
        } else if (path.node.name === '__on_deployed' || path.node.name === '__on_received') {
          throw buildError('__on_deployed and __on_received cannot be specified directly.', path)
        } else if (path.node.name === 'constructor' && path.parent.type !== 'ClassMethod') {
          throw buildError('Access to constructor is not supported.', path)
        }
      }
    }
  }
}
