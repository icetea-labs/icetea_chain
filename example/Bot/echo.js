@contract class EchoBot {
    @pure info() {
        return {
            spec_version: '1.0', // version of the bot spec
            bot_version: '1.0', // the version of this bot
            ontext_type: 'view',
            name: 'Echo bot',
            description: 'It just echoes what you say, like a parrot.'
        }
    }

    @view ontext(content: string) {
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