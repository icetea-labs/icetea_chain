const msg = this.runtime.msg;
switch (msg.name) {
  case '__on_deployed':
    this.setState('owner', msg.sender);
    break;
  case 'getValue':
    return this.getState('value');
  case 'setValue':
    if (this.getState('owner') !== msg.sender) {
      throw new Error('Only contract owner can set value');
    }
    if (!msg.params || !msg.params.length) {
      throw new Error('Invalid value');
    }
    this.setState('value', msg.params[0]);
    break;
  default:
    // call unsupported function -> inform caller our function list
    return {
      'getValue': { decorators: ['view'] },
      'setValue': { decorators: ['transaction'] }
    }
}