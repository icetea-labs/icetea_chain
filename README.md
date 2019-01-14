# Simple chain

## Setup
1. clone repo
2. npm install
3. npm start

If you change the client HTML/JS/CSS, rebuild using `npx webpack --watch`.

## Transfer money
1. http://localhost:3000/transfer.html
2. view mining progress at terminal window
3. view balance at http://localhost:3000/
4. Can also check balance at http://localhost:3000/api/balance?who=[address]

## Deploy contract
1. http://localhost:3000/deploy.html
2. Use the following code
```js
module.exports = {
    $onDeploy: (b) => {
        console.log(`${msg.sender} has just deployed this contract, the address is ${this.address}`);
        this.state.a = "onDeploy";
        this.state.b = b;
    },

    hello: (a, b, c) => {
        
        console.log(`Hello ${msg.sender} from ${this.address}`);
        console.log(`This block is mined at ${now}`);
        console.log(`The block hash is ${block.hash}`);
        console.log(`You pass the params ${a}, ${b}, ${c}`);
        console.log(`Current state is ${this.state.a}, ${this.state.b}, ${this.state.c}`);
        
        this.state.a = a;
        this.state.b = b;
        this.state.c = c;
    }
}
```

More sample contracts are available in _contracts_ folder.

## Call contract
1. http://localhost:3000/ (may need F5 to refresh)
2. See contract address (it is under stateTable, example `contract_thi_1546852296655`)
3. http://localhost:3000/contract.html
4. Fill the contract address and method params
5. See terminal console for log of contract execute
6. Refresh http://localhost:3000/ to see updated state
7. Repeat from #3 to test more...

## TODO
- [x] Generate address & private key for account
- [x] Check tx signature
- [ ] Check tx balance when transfer
- [ ] Support READ contract (no need to create TX) (**working**)
- [x] Support revert transaction (all or nothing)
- [ ] Support using ES6 class for contract (low priority)
- [ ] ABI extraction (low priority)
- [ ] Support Wasm contract (**high priority**)
- [ ] Create web3-like client lib
- [ ] Persist blockchain & state to disk
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
