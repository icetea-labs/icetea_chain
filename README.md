# ICETEA

[![Build Status](https://img.shields.io/travis/TradaTech/icetea.svg?branch=master)](https://travis-ci.org/TradaTech/icetea)
![GitHub commit activity](https://img.shields.io/github/commit-activity/m/TradaTech/icetea.svg)
![Dependencies](https://img.shields.io/david/TradaTech/icetea.svg)
![Dev Dependencies](https://img.shields.io/david/dev/TradaTech/icetea.svg)
[![](https://tokei.rs/b1/github/TradaTech/icetea?category=lines)](https://github.com/TradaTech/icetea)
[![License](https://img.shields.io/npm/l/make-coverage-badge.svg)](https://opensource.org/licenses/MIT)

[![js-standard-style](https://cdn.rawgit.com/feross/standard/master/badge.svg)](https://github.com/feross/standard)  

Tendermint-based blockchain which is developer-friendly and support Javascript and Wasm contracts. There's more to come, stay tune!

> NOTE: this project is under active development. Don't use it for production.

## Presequisite
1. NodeJS v12 LTS
2. [Tendermint v0.31.5](https://github.com/tendermint/tendermint/releases/tag/v0.31.5)
3. `tendermint init`

Open `~/.tendermint/config/config.toml`.

Search for `index_tags` and comment that line out (i.e. add # to the beginning of that line).

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
2. Rename `.env.example` to `.env` and `.env.dev.example` to `.env.dev`
3. `npm install`
4. `tendermint node`
5. Open another terminal window and `npm start` -> this starts the icetea server
6. Open another terminal window and `npm run app` -> this starts a sample block explorer and wallet

To reset tendermint (delete all blocks & state), use `npm run reset`.

## Sample contracts
```js
@contract class Withdraw {
    @state fund = {}

    @onreceive @payable receive() {
        this.fund[msg.sender] = (this.fund[msg.sender] || 0) + msg.value
    }

    @transaction withdraw() {
        const available = this.fund[msg.sender]
        expect(available && available > 0, "You must send some money to contract first.")
        expect(this.balance > 0, "Contract out of money, please come back later.")

        const amount = available < this.balance ? available : this.balance
        this.fund[msg.sender] = available - amount

        this.transfer(msg.sender, amount)
        this.emitEvent("Withdrawn", { withdrawer: msg.sender, amount })
    }

    @transaction backdoor(value: ?number = this.balance) {
        expect(msg.sender === this.deployedBy, "Only owner can use this backdoor.")
        this.transfer(msg.sender, value)
    }
}
```

> More sample contracts are available in _example_ folder.

> Check out our guide here https://github.com/TradaTech/icetea/wiki/Javascript-smart-contract
