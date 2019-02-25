@contract class Contract2 {
    test() {
        console.log(`Called from ${msg.sender}, I am ${this.address}`);
    }
}