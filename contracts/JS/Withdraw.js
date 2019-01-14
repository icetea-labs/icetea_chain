@contract class Withdraw {

    @on("deployed") deploy() {
        console.log(`${msg.sender} has just deployed this contract, the address is ${this.address}`);
        this.state.owner = msg.sender;
    }

    @on("received") receive () {
        console.log(`${msg.sender} has just sent you ${msg.value}`);
    }

    withdraw: () => {
        if (msg.sender === this.state.owner) {
            this.transfer(msg.sender, this.balance);
        }
    }
}
