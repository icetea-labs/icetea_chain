@contract class Withdraw {

    @on("deployed") deploy() {
        console.log(`${msg.sender} has just deployed this contract, the address is ${this.address}`);
        this.setState('owner', msg.sender);
    }

    @on("received") receive () {
        console.log(`${msg.sender} has just sent you ${msg.value}`);
    }

    withdraw() {
        require(msg.sender === this.getState('owner'), "Only ownder can widthdraw");
        this.transfer(msg.sender, this.balance);
    }
}
