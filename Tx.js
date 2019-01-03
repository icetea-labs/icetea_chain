module.exports = class Tx {

    // extra is null or empty: normal tx
    // create contract
    // extra = {
    //    op: 0,
    //    src: "console.log('hello worl')"";   
    // }
    // call contract function
    // extra = {
    //    op: 1,
    //    contract: {
    //        address: "thi_1546522456514",
    //        function: "Bye"
    //    }
    //}

    constructor(from, to, value, fee, extra) {
        this.from = from;
        this.to = to;
        this.value = value;
        this.fee = fee;
        this.extra = extra;
    }

    toString() {
        return [this.from, this.to, this.value, this.fee, JSON.stringify(this.extra)].join(";");
    }
}