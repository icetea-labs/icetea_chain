@contract class SimpleStore  {
    @state #value

    @transaction setValue(value) {
        this.#value = value
    }

    @view getValue() {
        return this.#value;
    }
}