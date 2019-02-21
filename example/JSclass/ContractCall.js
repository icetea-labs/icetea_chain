@contract class Contract1 {
    @state otherContract;

    constructor(other) {this.otherContract = other}

    test() {
        const contract = loadContract(this.otherContract);
        console.log(`Hello ${msg.sender} from ${this.address}`);
        console.log(`Contract value is ${contract.getValue()}`);
    }
}