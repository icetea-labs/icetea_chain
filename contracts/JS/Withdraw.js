module.exports = {

    $onDeploy: () => {
        console.log(`${msg.sender} has just deployed this contract, the address is ${this.address}`);
        this.state.owner = msg.sender;
    },

    $onReceive: () => {
        console.log(`${msg.sender} has just sent you ${msg.value}`);
    },

    withdraw: () => {
        if (msg.sender === this.state.owner) {
            this.transfer(msg.sender, this.balance);
        }
    }
}
