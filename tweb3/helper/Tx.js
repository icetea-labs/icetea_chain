const { TxOp } = require('./enum')
const { sha256 } = require('./codec')

module.exports = class {
  // create contract
  // data = {
  //    op: 0,
  //    src: "console.log('hello world')";
  // }
  // call contract function
  // data = {
  //    op: 1,
  //    name: "functionName",
  //    params: [1, "hello"]
  // }
  //
  // Some op in the future: set alias/options, vote, etc.

  constructor (from, to, value, fee, data, nonce) {
    if (!from) {
      throw new Error('Transaction "from" is required.')
    }

    this.from = from || ''
    this.to = to || ''
    this.value = parseFloat(value) || 0
    this.fee = parseFloat(fee) || 0
    this.data = data || {}
    this.nonce = nonce || Date.now() // FIXME

    if (this.value < 0 || this.fee < 0) {
      throw new Error('Value and fee cannot be negative.')
    }

    const content = {
      from: this.from,
      to: this.to,
      value: this.value,
      fee: this.fee,
      data: this.data,
      nonce: this.nonce
    }
    this.signatureMessage = sha256(content, 'hex')
  }

  setSignature (signature) {
    this.signature = signature
    return this
  }

  isContractCreation () {
    return this.data && this.data.op === TxOp.DEPLOY_CONTRACT
  }

  isContractCall () {
    return this.data && this.data.op === TxOp.CALL_CONTRACT
  }
}
