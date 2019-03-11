A place for system contract:
- alias management (name system)
- master bot
- app store
- vote (DPOS)

These features will not be implemted as SYSTEM contracts.
- deployer (currenly use a separate TX type: TxOp.DEPLOY_CONTRACT)
- sanitize (currently implemented via Runner.analyze/compile/patch)
- faucet (use regular contract, since this is for testnet only)

System contract is a core feature exposed as a contract. It does not need to be sandboxed, thus better performance and flexibility. However, it use the same state structure as regular contract.

We will use system contracts instead of adding more TxOp for alias, vote, etc.

System contract must use raw JS.