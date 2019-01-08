module.exports = {

    $onDeploy: (b) => {
        console.log(`${msg.sender} has just deployed this contract, the address is ${this.address}`);
        this.state.a = "onDeploy";
        this.state.b = b;
    },

    hello: (a, b, c) => {
        
        console.log(`Hello ${msg.sender} from ${this.address}`);
        console.log(`This block is mined at ${now}`);
        console.log(`The block hash is ${block.hash}`);
        console.log(`You pass the params ${a}, ${b}, ${c}`);
        console.log(`Current state is ${this.state.a}, ${this.state.b}, ${this.state.c}`);
        
        this.state.a = a;
        this.state.b = b;
        this.state.c = c;
    },

    callHelloArrow: () => {
        console.log("Set new state");
        this.hello("x", "y", "z");
        console.log(`Current state is ${this.state.a}, ${this.state.b}, ${this.state.c}`);
    },

    callHelloFunc: function() {
        console.log("Set new state");
        this.hello("x2", "y2", "z2");
        console.log(`Current state is ${this.state.a}, ${this.state.b}, ${this.state.c}`);
    }
}
