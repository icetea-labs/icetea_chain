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
                if (path.node.callee.name === "__contract_name") {
                    if (!contractName) {
                        throw path.buildCodeFrameError("Must have one class marked @contract.");
                    }
                    path.node.callee.name = contractName;
                }
            },
            Identifier(path) {
                if (path.node.name === "__on_deployed") {
                    throw path.buildCodeFrameError("__on_deployed cannot be specified directly.");
                }
            }
        }
    };
};
