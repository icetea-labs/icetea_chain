const state = {};

class Withdrawable {
    #owner = 1;

    get owner() {
        console.log("real one")
        return this.#owner;
    }

    set owner(value) {
        console.log("read set")
        this.#owner = value;
    }

    setState = (name, value) => state[name] = value;
    getState = name => state[name]; 
    hasState = name => state.hasOwnProperty(name);
  
    __on_deployed() {
      this.owner = 2;
    }
  
    withdraw() {
      this.owner = "haha";
    }

    getOwner = () => this.owner;
  
  }


const x = new Withdrawable();
/*
const __handler = {
    get: (obj, prop) => {
        console.log("get", prop);
        return obj[prop];
    },
    set: (obj, prop, value) => {
        console.log("set", prop, value);
        return true;
    }
};
const y = new Proxy(x, __handler);

y.withdraw();
console.log(y['getOwner'].apply(y, []));
//y.__on_deployed();
//y.owner = 3;
//y.withdraw();
*/

Object.getOwnPropertyNames(x.__proto__).forEach(p => {
    console.log(p)
    if (typeof x[p] !== 'function') {
        const value = Object.getOwnPropertyDescriptor(x.__proto__, p).value;
        Object.defineProperty(x, p, {
            get() {
                console.log("get", p);
                if (x.hasState(p)) return x.getState(p);
                return value;
            },
            set(v) {
                console.log("set", p, v)
                x.setState(p, v);
                return v;
            }
        })
    }
})

var x2 = x;// new Withdrawable();
console.log(x2.getOwner());
x2.__on_deployed();
x2.withdraw();
console.log(x2.getOwner());
