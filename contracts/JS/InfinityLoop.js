@contract class InfinityLoop {
    constructor() {
        let n = 10, m = 0;
        while (n > 0) {
            m++;
        }
    }
}

@contract class InfinityLoop2 {
    constructor() {
        while(true);
    }
}

@contract class InfinityLoop3 {
    constructor() {
        for(let i = 0;;i++);
    }
}

