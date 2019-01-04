if (msg.name === "Hello") {
    Hello();
} else if  (msg.name === "Bye") {
    Bye();
} else {
    _default();
}

function _default() {
    console.log("Hmmmmm");
}

function Hello() {
    console.log("Hello " + msg.sender);
}

function Bye() {
    console.log("Bye");
}