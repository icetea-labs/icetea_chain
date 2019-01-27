module.exports = class Blockchain {
    constructor(blocks) {
        this.blocks = blocks || [];
    }

    addBlock(block) {
        this.blocks.push(block);
    }

    getLatestBlockHash() {
        if (!this.blocks.length) return "0";
        return this.blocks[this.blocks.length - 1].hash;
    }
    getLatestBlockNumber() {
        if (!this.blocks.length) return -1;
        return this.blocks[this.blocks.length - 1].number;
    }
}