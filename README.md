# Tendermint-based icetea

## Presequisite
1. NodeJS 11.9 or later
2. [Tendermint](https://tendermint.com/docs/introduction/install.html)
3. `tendermint init`

Open `~/.tendermint/config/config.toml`.

Search for `index_tags` and comment out that line.

```
# index_tags = ...
```

Then search for and set `index_all_tags` to `true`.
```
index_all_tags = true
```

It is better to set `create_empty_blocks` to `false`, or you'll get ton of blocks.

```
create_empty_blocks = false
```


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

        this.emitEvent("Withdrawn", {withdrawer: msg.sender, amount});
    }

    @transaction backdoor(value) {
        require(msg.sender === this.owner, "Only owner can use this backdoor");
        value = value || this.balance;
        this.transfer(msg.sender, value);
    }
}
```

> More sample contracts are available in _example_ folder.

> Check out our guide here https://github.com/TradaTech/icetea/wiki/Javascript-smart-contract

## Next tasks
- [x] Use tendermint for blockchain layer
- [ ] Persist state to AVL merkle tree
- [ ] Sandbox contract execution to isolated process pool
