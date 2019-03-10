const REQUEST_AMOUNT = 10
@contract class Faucet {
    @state #receivers = {}
    @pure getAmount = (): number => REQUEST_AMOUNT
    
    @transaction request(): void {
        expect(!this.#receivers[msg.sender], `You already received ${this.#receivers[msg.sender]}. No more.`)
        expect(this.balance, 'This faucet is out of balance.')
        const v = REQUEST_AMOUNT > this.balance ? this.balance : REQUEST_AMOUNT
        this.#receivers[msg.sender] = v
        this.transfer(msg.sender, v)
    }

    @transaction withdraw(amount: number): void {
        expect(this.deployedBy === msg.sender, 'Only contract owner can withdraw.')
        this.transfer(msg.sender, amount > this.balance ? this.balance : amount)
    }
}
