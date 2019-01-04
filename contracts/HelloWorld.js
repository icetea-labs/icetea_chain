function _constructor() {
    console.log("_constructor");
}

function _default() {
    console.log("_default");
}

function Hello() {
    console.log("Hello " + msg.sender);
}

function Bye() {
    console.log("Bye");
}

if (msg.name === "_constructor") {
    _constructor && _constructor();
} else if (msg.name === "Hello") {
    Hello && Hello();
} else if  (msg.name === "Bye") {
    Bye && Bye();
} else {
    _default && _default();
}