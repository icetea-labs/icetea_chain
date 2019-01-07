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
    hello: (a, b, c) => {
        console.log(`Hello ${msg.sender}`);
        console.log(`This block is mined at ${now}`);
        console.log(`You pass the params ${a}, ${b}, ${c}`);
        console.log(`Current state is ${this.state.a}, ${this.state.b}, ${this.state.c}`);
        
        this.state.a = a;
        this.state.b = b;
        this.state.c = c;
    },

    _default: () => {
        console.log("fallback function!")
    }
}
```

## Call contract
1. http://localhost:3000/ (may need F5 to refresh)
2. See contract address (it is under state table, example `contract_thi_1546852296655`)
3. http://localhost:3000/contract.html
4. Fill the contract address and method params
5. See terminal console for log of contract execute
6. Refresh http://localhost:3000/ to see updated state
7. Repeat from #3 to test more...
