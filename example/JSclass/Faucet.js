const REQUEST_AMOUNT = 10
@contract class Faucet {
    @state #receivers = {}
    @pure getAmount() {
        return REQUEST_AMOUNT
    }
    @transaction request() {
        expect(!this.#receivers[msg.sender], `You already received ${this.#receivers[msg.sender]}. No more.`)
        expect(this.balance, 'This faucet is out of balance.')
        const v = REQUEST_AMOUNT > this.balance ? this.balance : REQUEST_AMOUNT
        receivers[msg.sender] = v
        this.transfer(msg.sender, v)
    }
    @transaction withdraw(amount) {
        expect(this.deployedBy === msg.sender, 'Only contract owner can withdraw.')
        this.transer(msg.sender, amount > this.balance ? this.balance : amount)
    }
}
