module.exports = function ({ types: t }) {
    const markers = {};
    function isPublic(type) {
        return ["ClassMethod", "ClassProperty"].includes(type);
    }
    return {
        name: "collect-contract-metadata",
        visitor: {
            Decorator(path) {
                const decoratorName = path.node.expression.name;
                if (["view", "payable"].includes(decoratorName)) {
                    if (isPublic(path.parent.type)) {
                        const name = path.parent.key.name || path.parent.key.id.name;
                        (markers[decoratorName] || (markers[decoratorName] = [])).push(name);
                        path.remove();
                    }
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
                    const members = [];
                    const program = path.findParent((p) => p.isProgram());
                    program.traverse({
                        ClassBody(path) {
                            path.node.body.forEach(e => {
                                if (isPublic(e.type) && !members.includes(e.key.name) &&
                                    !["constructor", "__on_deployed", "__on_received"].includes(e.key.name)) {
                                    members.push(e.key.name);
                                }
                            });
                        }
                    })
                    members.forEach(mem => {
                        const node = props.find(n => n.key.name = "members");
                        node.value.elements.push(t.stringLiteral(mem))
                    });
                }
            },
        }
    };
};
