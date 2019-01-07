# Simple chain

## Setup
1. clone repo
2. npm install
3. npm start

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
    $onDeploy: () => {
        console.log(`${msg.sender} has just deployed this contract, the address is ${this.address}`);
        this.state.a = "onDeploy";
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
1. Generate address & private key for account
2. Check tx signature
3. Check tx balance when transfer
4. Support READ contract (no need to create TX)
5. Support revert transaction (all or nothing)
6. Support using ES6 class for contract
7. Support Wasm contract
8. VM should be in-process or spawn a new process?
9. Properly sandbox smart contract execution environment
10. Persist blockchain & state to disk
11. Use merkle trie for storing state
12. Remove non-deterministic from JS contracts
13. Remove non-deterministic stuff from Wasm contracts
14. Gas calculation for JS contracts
15. Gas calculation (metering layer) for Wasm contracts
