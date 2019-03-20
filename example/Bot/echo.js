@contract class EchoBot {
    info = {
        spec_version: '1.0', // version of the bot spec
        bot_version: '1.0', // the version of this bot
        ontext_type: 'pure',
        name: 'Echo bot',
        description: 'It just echoes what you say, like a parrot.'
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
