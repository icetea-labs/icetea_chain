@contract class Contract1 {
    @state otherContract;

    constructor(other) {this.otherContract = other}

    @view test() {
        const contract = loadContract(this.otherContract);
        console.log(`I am ${this.address}, calling ${this.otherContract}`);
        contract.test.invokeView()
    }
}