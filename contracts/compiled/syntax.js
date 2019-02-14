class Test {
    #value
    getValue() {
        return this.#value;
    }
    #setValue(value) {
        this.#value = value;
    }

    get value() {
        return this.#value;
    }
}

const t = new Test();
console.log(t.getValue());
t.setValue(1);
console.log(t.getValue());
console.log(t.value);
//console.log(t.#value);

return;

var x = `
class SimpleStore {
    get #value() {
      //__guard.enterFunction("_ref3", 0, 0)
  
      return this.getState("#value");
    }
  
    set #value(value) {
      //__guard.enterFunction("_ref4", 0, 0)
  
      this.setState("#value", value);
    }
  
    setValue(value) {
      //__guard.enterFunction("_ref", 4, 4)
  
      this.#value = value;
    }
  
    getValue() {
      //__guard.enterFunction("_ref2", 8, 4)
  
      return this.#value;
    }
  
  }
  
  ;
  
  const __contract = new SimpleStore();
  
  const __metadata = {
    #value: {
      type: "ClassPrivateProperty",
      decorators: ["state", "pure"]
    },
    setValue: {
      type: "ClassMethod",
      decorators: ["view"]
    },
    getValue: {
      type: "ClassMethod",
      decorators: ["view"]
    }
  };
`;

var f = new Function(x);
f();