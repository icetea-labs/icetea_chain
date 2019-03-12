A place for system contracts:
- alias management (name system) -> system.alias
- master bot -> system.botmaster
- app store -> system.appstore
- vote (DPOS) -> system.vote

These features will not be implemted as SYSTEM contracts.
- deployer (currently implemented by TxOp.DEPLOY_CONTRACT)
- sanitize (currently implemented via Runner.analyze/compile/patch)

This is also implemented as system contract, although it is testnet only.
- faucet -> system.faucet

System contract is a core feature exposed as a contract. It does not need to be sandboxed, thus better performance and flexibility. However, it use the same state structure as regular contract.

We will favor system contracts over adding more TxOp for alias, vote, etc.

System contract must use raw JS. They are auto-deployed by 'system' when on blockchain init.