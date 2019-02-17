function wrapState(t, item) {
    const name = item.node.key.name || ("#" + item.node.key.id.name);
    const initVal = item.node.value;
    const getState = t.identifier("getState");
    const thisExp = t.thisExpression();
    const memExp = t.memberExpression(thisExp, getState);
    const callExpParams = [t.stringLiteral(name)];
    //if (initVal) callExpParams.push(initVal);
    const callExp = t.callExpression(memExp, callExpParams)
    const getter = t.classMethod("get", t.identifier(name), [],
        t.blockStatement([t.returnStatement(callExp)]))

    const setMemExp = t.memberExpression(thisExp, t.identifier("setState"));
    const setCallExp = t.callExpression(setMemExp, [t.stringLiteral(name), t.identifier("value")])
    const setter = t.classMethod("set", t.identifier(name), [t.identifier("value")],
        t.blockStatement([t.expressionStatement(setCallExp)]))

    // replace @state instance variable with a pair of getter and setter
    item.replaceWithMultiple([getter, setter]);

    // if there's initializer, move it into constructor
    if (initVal) {
        let deployer = item.parent.body.find(p => p.kind == "constructor");

        // if no constructor, create one
        if (!deployer) {
            deployer = t.classMethod("constructor", t.identifier("constructor"), [], t.blockStatement([]));
            item.parent.body.unshift(deployer);
        }

        // create a this.item = initVal;
        const setExp = t.memberExpression(thisExp, t.identifier(name));
        var assignState = t.expressionStatement(t.assignmentExpression("=", setExp, initVal));
        deployer.body.body.unshift(assignState);

    }
}

module.exports = function ({ types: t }) {
    let contractName = null;
    return {
        visitor: {
            Decorator(path) {
                const decoratorName = path.node.expression.name;
                if (decoratorName === "contract") {
                    if (path.parent.type === "ClassDeclaration") {
                        if (contractName && contractName !== path.parent.id.name) {
                            throw path.buildCodeFrameError("More than one class marked with @contract. Only one is allowed.");
                        }
                        contractName = path.parent.id.name;

                        const members = path.parentPath.get("body.body");
                        members.forEach(mp => {
                            const m = mp.node;

                            // process decorators
                            const mds = mp.get("decorators");
                            if (mds && mds.length) {
                                mds.forEach(dp => {
                                    const d = dp.node;
                                    const dname = d.expression.name;
                                    if (dname === "state") {
                                        wrapState(t, mp);
                                    } else if (dname === "onReceived") {
                                        const newNode = t.classProperty(t.identifier("__on_received"),
                                            t.memberExpression(t.thisExpression(), t.identifier(m.key.name || ("#" + m.key.id.name))));
                                        path.parent.body.body.push(newNode);

                                        dp.remove();
                                    }
                                })
                            }
                        });

                        // process constructor
                        /*
                        const m = path.parent.body.body.find(n => n.kind === "constructor");
                        if (m) {
                            m.kind = "method";
                            m.key.name = "__on_deployed";
                        }
                        */
                    }
                    path.remove();
                }
            },
            NewExpression(path) {
                const calleeName = path.node.callee.name;
                if (calleeName === "__contract_name") {
                    if (!contractName) {
                        throw path.buildCodeFrameError("Must have one class marked @contract.");
                    }
                    path.node.callee.name = contractName;
                } else if (calleeName === "Function") {
                    throw path.buildCodeFrameError("Running dynamic code at global scope is restricted.");
                }
            },
            Identifier(path) {
                if (path.node.name === "__on_deployed" || path.node.name === "__on_received") {
                    throw path.buildCodeFrameError("__on_deployed and __on_received cannot be specified directly.");
                } else if (path.node.name === "constructor" && path.parent.type !== "ClassMethod") {
                    throw path.buildCodeFrameError("Access to constructor is not supported.");
                }
            }
        }
    };
};
