const { IceTeaWeb3 } = require('../tweb3')
const { TxOp, ContractMode } = require('../icetea/enum')
const fs = require('fs')

console.log('Deploying the faucet...')

const tweb3 = new IceTeaWeb3('ws://localhost:26657/websocket')

const src = fs.readFileSync('./example/JSclass/Faucet.js', 'base64')

const key = '5K4kMyGz839wEsG7a9xvPNXCmtgFE5He2Q8y9eurEQ4uNgpSRq7'
const from = '617BFqg1QhNtsJiNiWz9jGpsm5iAJKqWQBhhk36KjvUFqNkh47'
const value = 10000000000000000000000
const op = TxOp.DEPLOY_CONTRACT
const mode = ContractMode.JS_DECORATED

tweb3.sendTransactionCommit({ from, value, data: { op, mode, src } }, key)
  .then(result => {
    console.log('Deployed faucet finished with code: ' + ((result.deliver_tx || result.check_tx).code || 0))
    tweb3.close()
  })
