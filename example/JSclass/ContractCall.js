@contract class Contract1 {
    @state otherContract;

    constructor(other) {this.otherContract = other}

    test() {
        const contract = loadContract(this.address, this.otherContract);
        console.log(`I am ${this.address}, calling ${this.otherContract}`);
        contract.test()
    }
}