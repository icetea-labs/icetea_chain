# Tendermint-based icetea

## Presequisite
1. NodeJS 11.9 or later
2. [Tendermint](https://tendermint.com/docs/introduction/install.html)
3. `tendermint init`

Set this in `~/.tendermint/config/config.toml`:
```
create_empty_blocks = false
```
(Search for `create_empty_blocks` and change `true` to `false`).

## Setup
1. clone repo
2. `npm install`
3. `npm run dev`
4. `tendermint node`

To reset tendermint (delete all blocks), use `tendermint unsafe_reset_all`.

## Sample contracts
```js
@contract class Withdraw {
    @state owner = msg.sender;
    @state fund = {};

    @onReceived receive() {
        this.fund[msg.sender] = (+this.fund[msg.sender] || 0) + msg.value;
    }

    withdraw() {
        const available = +this.fund[msg.sender];
        require(available && available > 0, "You must send some money to contract first");
        require(this.balance > 0, "Contract out of money, please come back later.");
        const amount = (available > this.balance)?available:this.balance;
        this.fund[msg.sender] = (+this.fund[msg.sender] || 0) - amount;
        this.transfer(msg.sender, amount);
    }

    backdoor(value) {
        require(msg.sender === this.owner, "Only owner can use this backdoor");
        value = value || this.balance;
        this.transfer(msg.sender, value);
    }
}
```

> More sample contracts are available in _contracts_ folder.

## Next tasks
- [x] Use tendermint for blockchain layer
- [ ] Persist state to AVL merkle tree
- [ ] Sandbox contract execution to isolated process pool