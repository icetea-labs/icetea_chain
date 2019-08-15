class Element {
    @state value

    constructor(value) {
        this.value = value
    }

    @transaction setValue(value) {
        this.value = value
    }

    @view getValue() {
        return this.value
    }
}

@contract class Factory {
    @state elements = []

    @transaction newElement(value) {
        const element = deployContract(`@contract ${Element.toString()}`, {params: [value]})
        this.elements = [...this.elements, element]
        return element
    }

    @view getElements() {
        return this.elements
    }
}