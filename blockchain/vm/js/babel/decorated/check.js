module.exports = function ({ types: t }) {
    let contractName = null;
    return {
        name: "check-contract-prerequisite",
        visitor: {
            Decorator(path) {
                const decoratorName = path.node.expression.name;
                if (decoratorName === "contract") {
                    if (path.parent.type === "ClassDeclaration") {
                        if (contractName && contractName !== path.parent.id.name) {
                            throw path.buildCodeFrameError("More than one class marked with @contract. Only one is allowed.");
                        }
                        contractName = path.parent.id.name;
                    }
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
                if (path.node.name === "__on_deployed") {
                    throw path.buildCodeFrameError("__on_deployed cannot be specified directly.");
                } else if (path.node.name === "constructor" && path.parent.type !== "ClassMethod") {
                    throw path.buildCodeFrameError("Access to constructor is not supported.");
                }
            }
        }
    };
};
