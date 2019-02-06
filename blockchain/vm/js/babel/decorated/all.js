/*
function isPublic(type) {
    return ["ClassMethod", "ClassProperty"].includes(type);
}
function isPrivate(type) {
    return ["ClassPrivateMethod", "ClassPrivateProperty"].includes(type);
}
*/

function isMethod(mp) {
    //console.log(mp);
    if (!mp.node) return false;
    const type = mp.node.type;
    if (type === "ClassMethod" || type === "ClassPrivateMethod") {
        return true;
    }

    // check if value if function is a function or arrow function
    const valueType = mp.node.value && mp.node.value.type;
    return valueType === "FunctionExpression" ||
        valueType === "ArrowFunctionExpression";

}

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

const SYSTEM_DECORATORS = ["state", "onReceived", "transaction", "view", "pure", "payable"];
const STATE_CHANGE_DECORATORS = ["transaction", "view", "pure", "payable"];
const SPECIAL_MEMBERS = ["constructor", "__on_deployed", "__on_received"];

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

                        const memberMeta = {};

                        const members = path.parentPath.get("body.body");
                        //console.log(members);
                        members.forEach(mp => {
                            const m = mp.node;
                            //console.log(mp);

                            const propName = m.key.name || ("#" + m.key.id.name);
                            memberMeta[propName] = {
                                mp,
                                type: m.type,
                                decorators: []
                            };

                            // process decorators
                            const mds = mp.get("decorators");
                            if (mds && mds.length) {
                                mds.forEach(dp => {
                                    const d = dp.node;
                                    const dname = d.expression.name;

                                    memberMeta[propName].decorators.push(dname);

                                    if (dname === "state") {
                                        if (isMethod(mp)) {
                                            throw mp.buildCodeFrameError("Class method cannot be decorated as @state");
                                        }
                                        wrapState(t, mp);
                                    }
                                    else if (dname === "onReceived") {
                                        const newNode = t.classProperty(t.identifier("__on_received"),
                                            t.memberExpression(t.thisExpression(), t.identifier(propName)));
                                        path.parent.body.body.push(newNode);
                                    }

                                    if (SYSTEM_DECORATORS.includes(dname)) dp.remove();
                                })
                            }
                        });

                        // process constructor => no need since we'll use Object.create

                        const m = path.parent.body.body.find(n => n.kind === "constructor");
                        if (m) {
                            m.kind = "method";
                            m.key.name = "__on_deployed";
                        }


                        // process metadata

                        Object.keys(memberMeta).forEach(key => {
                            const stateDeco = memberMeta[key].decorators.filter(e => STATE_CHANGE_DECORATORS.includes(e));
                            const isState = memberMeta[key].decorators.includes("state");
                            const mp = memberMeta[key].mp;
                            if (!isMethod(mp)) {
                                if (stateDeco.length)
                                    throw mp.buildCodeFrameError("State mutability decorators cannot be attached to variables");
                                else {
                                    // default to view
                                    memberMeta[key].decorators.push("pure");
                                }
                            } else if (key.startsWith("#") && stateDeco.includes("payable")) {
                                throw mp.buildCodeFrameError("Private function cannot be payable");
                            } else {
                                if (!stateDeco.length) {
                                    // default to view
                                    memberMeta[key].decorators.push("view");
                                } else if (stateDeco.length > 1) {
                                    throw mp.buildCodeFrameError(`Could not define multiple state mutablility decorators: ${stateDeco.join(", ")}`);
                                }
                            }
                        })

                        const program = path.findParent(p => p.isProgram());
                        const metaDeclare = program.get("body").find(p => p.isVariableDeclaration() && p.node.declarations[0].id.name === "__metadata");
                        if (metaDeclare) {
                            const props = metaDeclare.node.declarations[0].init.properties;
                            Object.keys(memberMeta).forEach(prop => {
                                if (!SPECIAL_MEMBERS.includes(prop)) {
                                    const value = memberMeta[prop];
                                    const ds = [];
                                    value.decorators.forEach(d => ds.push(t.stringLiteral(d)))
                                    props.push(t.objectProperty(t.identifier(prop),
                                        t.objectExpression([
                                            t.objectProperty(t.identifier("type"), t.stringLiteral(value.type)),
                                            t.objectProperty(t.identifier("decorators"), t.arrayExpression(ds)),
                                        ])));

                                }
                            });
                        }
                    }
                    path.remove();
                }
            },
            NewExpression(path) {
                const calleeName = path.node.callee.name;
                if (calleeName === "Function") {
                    throw path.buildCodeFrameError("Running dynamic code at global scope is restricted.");
                }
            },
            Identifier(path) {
                if (path.node.name === "__contract_name") {
                    if (!contractName) {
                        throw path.buildCodeFrameError("Must have one class marked @contract.");
                    }
                    path.node.name = contractName;
                } else if (path.node.name === "__on_deployed" || path.node.name === "__on_received") {
                    throw path.buildCodeFrameError("__on_deployed and __on_received cannot be specified directly.");
                } else if (path.node.name === "constructor" && path.parent.type !== "ClassMethod") {
                    throw path.buildCodeFrameError("Access to constructor is not supported.");
                }
            }
        }
    };
};
