module.exports = {
    hello: (a, b, c) => {
        console.log(`Hello ${msg.sender}`);
        console.log(`This block is mined at ${now}`);
        console.log(`You pass the params ${a}, ${b}, ${c}`);
        console.log(`Current state is ${this.state.a}, ${this.state.b}, ${this.state.c}`);
        
        this.state.a = a;
        this.state.b = b;
        this.state.c = c;
    },

    _default: () => {
        console.log("fallback function!")
    }
}
