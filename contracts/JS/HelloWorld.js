@contract class HelloWorld {

    @useState bye = 1;
    
    @on("deployed") deploy(b) {
        console.log(`${msg.sender} has just deployed this contract, the address is ${this.address}`);
        console.log(`Current value ${bye.get()}`)
        this.bye.set(200);
        console.log(`After value ${bye.get()}`)
    }

    hello () {
        console.log(`Hello ${msg.sender} from ${this.address}`);
        console.log(`This block is mined at ${now}`);
        console.log(`The block hash is ${block.hash}`);
    }
}

