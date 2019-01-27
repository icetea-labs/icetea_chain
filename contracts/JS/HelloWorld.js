@contract class HelloWorld {

    @state bye = 1;
    
    constructor (b) {
        console.log(`You pass ${b}`);
        console.log(`${msg.sender} has just deployed this contract, the address is ${this.address}`);
        console.log(`Initial value ${this.bye}`)
        this.bye = 2;
        console.log(`After set ${this.bye}`)
    }

    hello() {
        console.log(`Hello ${msg.sender} from ${this.address}`);
        console.log(`This block is mined at ${now}`);
        console.log(`The block hash is ${block.hash}`);
        console.log(`Current value ${this.bye}`);
    }
}
