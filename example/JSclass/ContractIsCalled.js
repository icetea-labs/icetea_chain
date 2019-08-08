@contract class Contract2 {
    @view test() {
        console.log(`Called from ${msg.sender}, I am ${this.address}`);
    }
}