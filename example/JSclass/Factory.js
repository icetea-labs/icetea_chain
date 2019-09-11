const CONTRACT_SRC = `
const msg = this.runtime.msg;
console.log(msg)
switch (msg.name) {
case 'getValue':
    return this.getState('value');
case 'setValue':
    if (!msg.params || !msg.params.length) {
        throw new Error('Invalid value');
    }
    this.setState('value', msg.params[0]);
    this.emitEvent('ValueChanged', {value: msg.params[0]})
    break;
default:
    // call unsupported function -> inform caller our function list
    return {
        'getValue': { decorators: ['view'] },
        'setValue': { decorators: ['transaction'] }
    }
}`

@contract class Factory {
    @state elements = []

    @payable newElement(value) {
        const element = deployContract(CONTRACT_SRC, { value })
        this.elements = [...this.elements, element]
        return element
    }

    @view getElements() {
        return this.elements
    }
}