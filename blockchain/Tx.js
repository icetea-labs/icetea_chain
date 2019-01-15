const crypto = require('crypto');

module.exports = class Tx {

    // data is null or empty: normal tx
    // create contract
    // data = {
    //    op: 0,
    //    src: "console.log('hello worl')"";   
    // }
    // call contract function
    // data = {
    //    op: 1,
    //    name: "functionName",
    //    params: [1, "hello"]
    //}

    constructor(from, to, value, fee, data) {
        this.from = from;
        this.to = to;
        this.value = value;
        this.fee = fee;
        this.data = data;

        const content = [this.from, this.to, this.value, this.fee, JSON.stringify(this.data)].join(";");
        this.hash = crypto.createHash('sha256').update(content).digest("hex");
    }

    setSignature(signature) {
        this.signature = signature;
    }

    isContractCreation() {
        return this.data && this.data.op === 0;
    }

    isContractCall() {
        return this.data && this.data.op === 1;
    }

    toString() {
        return this.hash;
    }
}