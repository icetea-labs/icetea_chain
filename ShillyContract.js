if (arg === "Hello") {
    Hello();
} else if  (arg === "Bye") {
    Bye();
} else {
    DefaultFunction();
}

function DefaultFunction() {
    console.log("clgt");
}

function Hello() {
    console.log("Hello " + tx.from);
}

function Bye() {
    console.log("Bye");
}