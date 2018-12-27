module.exports = class Tx {
    constructor(from, to, value, fee) {
        this.from = from;
        this.to = to;
        this.value = value;
        this.fee = fee;
    }

    toString() {
        return [this.from, this.to, this.value, this.fee].join(";");
    }
}