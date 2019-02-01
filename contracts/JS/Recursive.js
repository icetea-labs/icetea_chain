@contract class Recursive1 {
    hello() {
        this.hello();
    }
}

@contract class Recursive1 {
    hello() {
        this.hello2();
    }

    hello2 = () => {
        return this.hello();
    }
}