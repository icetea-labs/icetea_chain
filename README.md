# Simple chain

## Setup
1. clone repo
2. npm install
3. npm run dev
4. http://localhost:3001

## Sample contracts
```js
@contract class HelloWorld {
    @on("deployed") deploy(b) {
        console.log(`${msg.sender} has just deployed this contract, the address is ${this.address}`);
        this.state.a = "onDeploy";
        this.state.b = b;
    }

    hello (a, b, c) {
        console.log(`Hello ${msg.sender} from ${this.address}`);
        console.log(`This block is mined at ${now}`);
        console.log(`The block hash is ${block.hash}`);
        console.log(`You pass the params ${a}, ${b}, ${c}`);
        console.log(`Current state is ${this.state.a}, ${this.state.b}, ${this.state.c}`);
        
        this.state.a = a;
        this.state.b = b;
        this.state.c = c;
    }

    callHello() {
        console.log("Set new state");
        this.hello("x", "y", "z");
        console.log(`Current state is ${this.state.a}, ${this.state.b}, ${this.state.c}`);
    }
}
```

> More sample contracts are available in _contracts_ folder.

## TODO
- [x] Generate address & private key for account
- [x] Check tx signature
- [ ] Check tx balance when transfer
- [ ] View and payable markers
- [ ] Wrap state accesses in set/get methods
- [ ] Support READ contract (no need to create TX) (**working**)
- [x] Support revert transaction (all or nothing)
- [x] Support using ES6 class for contract
- [ ] Use receipts for TX results
- [ ] ABI extraction (low priority)
- [ ] Support Wasm contract (**high priority**)
- [ ] Create web3-like client lib
- [ ] Persist blockchain & state to disk (leveldb)
- [ ] Use merkle trie for storing state
- [ ] Remove non-deterministic from JS contracts
- [ ] Remove non-deterministic stuff from Wasm contracts
- [ ] Gas calculation for JS contracts
- [ ] Gas calculation (metering layer) for Wasm contracts
- [ ] Use libp2p for p2p
- [ ] Split VM into its own project
- [ ] Make VM layer Tendermint/substrate compatible

## Miscellanous
- [ ] VM should be in-process or spawn a new process?
- [ ] Properly sandbox smart contract execution environment
- [ ] How to terminiate long-running tx (gas vs timer vs holders...)
