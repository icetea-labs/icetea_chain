# Simple chain

## Setup
1. Require NodeJS 11.9
2. clone repo
3. npm install
4. npm run dev
5. http://localhost:3001

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

## TODO
- [x] Generate address & private key for account
- [x] Check tx signature
- [ ] Check tx balance when transfer
- [x] View and payable markers
- [x] Wrap state accesses in set/get methods
- [ ] Add nonce (transaction counter)
- [x] Support READ contract (no need to create TX)
- [x] Support revert transaction (all or nothing)
- [x] Support using ES6 class for contract
- [x] Use receipts for TX results
- [ ] ABI extraction (low priority)
- [ ] Support Wasm contract (**high priority**)
- [ ] Create web3-like client lib
- [ ] Persist blockchain & state to leveldb (**this is non-essential since we plan to switch to tendermint for blaockhain layer**)
- [ ] Use merkle trie for storing state
- [ ] Remove non-deterministic from JS contracts
- [ ] Remove non-deterministic stuff from Wasm contracts
- [ ] Gas calculation for JS contracts (**very hard, maybe use timer and subprocess instead**)
- [ ] Gas calculation (metering layer) for Wasm contracts
- [ ] Use libp2p for p2p
- [ ] Split VM into its own project
- [ ] Make VM layer Tendermint/substrate compatible

## Miscellanous
- [ ] VM should be in-process or spawn a new process?
- [ ] Properly sandbox smart contract execution environment
- [ ] How to terminiate long-running tx (gas vs timer vs holders...)
