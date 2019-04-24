@contract class EchoBot {
    botInfo = {
        name: 'Echo bot',
        description: 'It just echoes what you say, like a parrot.',
        state_access: 'none'
    }

    @pure onstart() {
        return this.ontext('Start')
    }

    @pure ontext(content: string) {
        return [{
            type: 'text',
            content
        }, {
            type: 'input',
            content: {
                placeholder: 'Say something'
            }
        }]
    }
}
