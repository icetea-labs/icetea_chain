@contract class HelloWorld {

    @useState bye = 1;
    
    @on("deployed") deploy(b) {
        console.log(`You pass ${b}`);
        console.log(`${msg.sender} has just deployed this contract, the address is ${this.address}`);
        console.log(`Initial value ${this.bye.get()}`)
        this.bye.set(b);
        console.log(`After set ${this.bye.get()}`)
    }

    hello () {
        console.log(`Hello ${msg.sender} from ${this.address}`);
        console.log(`This block is mined at ${now}`);
        console.log(`The block hash is ${block.hash}`);
        console.log(`Current value ${this.bye.get()}`);
    }
}

