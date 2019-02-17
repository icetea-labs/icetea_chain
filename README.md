# Tendermint-based icetea

## Presequisite
1. NodeJS 11.9 or later
2. [Tendermint](https://tendermint.com/docs/introduction/install.html)
3. `tendermint init`

Set this in `~/.tendermint/config/config.toml`:

```
index_tags = "tx.hash,tx.height"
```

(Search for `index_tags` and set value to `"tx.hash,tx.height"`).

It is better to set this also, or you'll get ton of blocks.

```
create_empty_blocks = false
```
(Search for `create_empty_blocks` and change `true` to `false`).


## Setup
1. clone repo
2. `npm install`
3. `npm run dev`

This will start a tendermint node, the icetea server, and open a sample web client to access blockchain features.

To reset tendermint (delete all blocks), use `npm run reset`.

## Sample contracts
```js
@contract class Withdraw {
    @state owner = msg.sender;
    @state fund = {};

    @onReceived receive() {
        this.fund[msg.sender] = (+this.fund[msg.sender] || 0) + msg.value;
    }

    @transaction withdraw() {
        const available = +this.fund[msg.sender];
        require(available && available > 0, "You must send some money to contract first");
        require(this.balance > 0, "Contract out of money, please come back later.");
        const amount = (available > this.balance)?available:this.balance;
        this.fund[msg.sender] = (+this.fund[msg.sender] || 0) - amount;
        this.transfer(msg.sender, amount);
    }

    @transaction backdoor(value) {
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