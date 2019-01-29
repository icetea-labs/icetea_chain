module.exports = function ({ types: t }) {
    //console.log(t);
      let contractName = "";
      const markers = {};
      const members = [];
      function isPublic(type) {
        return ["ClassMethod", "ClassProperty"].includes(type);
      }
        function isPrivate(type) {
        return ["ClassPrivateMethod", "ClassPrivateProperty"].includes(type);
      }
    function isClassMember(type) {
        return isPublic(type) || isPrivate(type);
      }
      return {
          name: "tchain-contract-transform",
          visitor: {
              Decorator(path) {
                  const decoratorName = path.node.expression.name;
                  if (decoratorName === "contract") {
                      if (path.parent.type === "ClassDeclaration") {
                          contractName = path.parent.id.name;
                          const c = path.parent.body.body.find(n => n.kind === "constructor");
                          if (c) {
                              c.kind = "method";
                              c.key.name = "__on_deployed";
                          }
                      }
                      path.remove();
                  } else if (decoratorName === "onReceived") {
                      if (isClassMember(path.parent.type)) {
                          path.parent.key.name = "__on_received";
                          path.remove();
                      }
                  } else if (["canView", "canUpdate", "canReveive", "canSend"].includes(decoratorName)) {
                    //console.log("[",decoratorName || "??","]",path.parent.key);
                      if (isPublic(path.parent.type)) {
                        const name = path.parent.key.name || path.parent.key.id.name;
                        //console.log(path.parent.key);
                          (markers[decoratorName] || (markers[decoratorName] = [])).push(name);
                          path.remove();
                      }
                  } else if (decoratorName === "useState") {
                    const item = path.findParent(p => p.isClassProperty());
                      const name = item.node.key.name;
          const initVal = item.node.value;
          const getState = t.identifier("getState");
          const thisExp = t.thisExpression();
          const memExp = t.memberExpression(thisExp, getState);
          const callExpParams = [t.stringLiteral(name)];
          if (initVal) callExpParams.push(initVal);
          const callExp = t.CallExpression(memExp, callExpParams)
          const getter = t.classMethod("get", t.identifier(name),[],
                       t.blockStatement([t.returnStatement(callExp)]))
  
          const setMemExp = t.memberExpression(thisExp, t.identifier("setState"));
          const setCallExp = t.CallExpression(setMemExp, [t.stringLiteral(name), t.identifier("value")])
          const setter = t.classMethod("set", t.identifier(name),[t.identifier("value")],
                       t.blockStatement([t.expressionStatement(setCallExp)]))
          item.replaceWithMultiple([getter, setter]);
                    
                    
                  }
              },
              NewExpression(path) {
                  if (path.node.callee.name === "__contract_name") {
                      path.node.callee.name = contractName;
                  }
              },
              Identifier(path) {
                  if (path.node.name === "__metadata") {
                      const props = path.parent.init.properties;
                      Object.keys(markers).forEach(mark => {
                          const node = props.find(n => n.key.name === mark);
                          markers[mark].forEach(e => node.value.elements.push(t.stringLiteral(e)))
                      });
                    // collect class data
                    const program = path.findParent((p) => p.isProgram());
                      program.traverse({
                          ClassBody(path) {
                              path.node.body.forEach(e => {
                                  if (isPublic(e.type)) {
                                      members.push(e.key.name);
                                  }
                              });
                          }
                      })
                      members.forEach(mem => {
                        const node = props.find(n => n.key.name = "members");
                        node.value.elements.push(t.stringLiteral(mem))
                      });
                  } else if (path.node.name === "__on_deployed") {
                    throw path.buildCodeFrameError("__on_deployed cannot be specified directly.");
                  }
              },
  
          }
      };
  };
  