module.exports = class Blockchain {
    constructor(blocks) {
        this.blocks = blocks || [];
    }

    addBlock(block) {
        this.blocks.push(block);
    }
}