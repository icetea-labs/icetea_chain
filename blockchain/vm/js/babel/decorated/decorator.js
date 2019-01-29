//const template = require("@babel/template").default;

module.exports = function ({ types: t }) {
    function isPublic(type) {
        return ["ClassMethod", "ClassProperty"].includes(type);
    }
    function isPrivate(type) {
        return ["ClassPrivateMethod", "ClassPrivateProperty"].includes(type);
    }
    function isClassMember(type) {
        return isPublic(type) || isPrivate(type);
    }
    let contract = null;
    let deployer = null;
    return {
        name: "process-known-decorators",
        visitor: {
            Decorator(path) {
                const decoratorName = path.node.expression.name;
                //console.log(decoratorName)
                if (decoratorName === "contract") {
                    if (path.parent.type === "ClassDeclaration") {
                        contract = path.findParent(p => p.isClassDeclaration());
                        deployer = path.parent.body.body.find(n => n.kind === "constructor");
                        if (deployer) {
                            deployer.kind = "method";
                            deployer.key.name = "__on_deployed";
                        }
                    }
                    path.remove();
                } else if (decoratorName === "onReceived") {
                    if (isClassMember(path.parent.type)) {
                        //path.parent.key.name = "__on_received";
                        const newNode = t.classProperty(t.identifier("__on_received"), t.memberExpression(t.thisExpression(), t.identifier(path.parent.key.name)));
                        path.findParent(p => p.isClassDeclaration()).node.body.body.push(newNode);
                        path.remove();
                    }
                } else if (decoratorName === "state") {
                    const item = path.findParent(p => p.isClassProperty());
                    const name = item.node.key.name;
                    const initVal = item.node.value;
                    const getState = t.identifier("getState");
                    const thisExp = t.thisExpression();
                    const memExp = t.memberExpression(thisExp, getState);
                    const callExpParams = [t.stringLiteral(name)];
                    //if (initVal) callExpParams.push(initVal);
                    const callExp = t.CallExpression(memExp, callExpParams)
                    const getter = t.classMethod("get", t.identifier(name), [],
                        t.blockStatement([t.returnStatement(callExp)]))

                    const setMemExp = t.memberExpression(thisExp, t.identifier("setState"));
                    const setCallExp = t.CallExpression(setMemExp, [t.stringLiteral(name), t.identifier("value")])
                    const setter = t.classMethod("set", t.identifier(name), [t.identifier("value")],
                        t.blockStatement([t.expressionStatement(setCallExp)]))
                    item.replaceWithMultiple([getter, setter]);

                    if (initVal) {
                        if (!deployer) {
                            deployer = item.parent.body.find(p => p.kind == "constructor")
                        }

                        if (!deployer) {
                            deployer = t.classMethod("method", t.identifier("__on_deployed"), [], t.blockStatement([]));
                            item.parent.body.unshift(deployer);
                        }

                        // create a this.item = initVal;
                        const setExp = t.memberExpression(thisExp, t.identifier(name));
                        var assignState = t.expressionStatement(t.assignmentExpression("=", setExp, initVal));
                        deployer.body.body.unshift(assignState);

                    }
                }
            },
        }
    };
};
