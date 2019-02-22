@contract class SimpleStore  {
    @state otherContract;

    constructor(other) {this.otherContract = other}

    @transaction setValue(value) {
        const contract = loadContract(this.otherContract);
        contract.setValue(value)
    }
}