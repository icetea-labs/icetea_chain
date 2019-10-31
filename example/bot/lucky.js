const { SurveyBot, Message } = require('@iceteachain/utils')
const { orderBy } = require('lodash')

const formatTime = ms => {
    const asiaTime = new Date(ms).toLocaleString("en-US", {timeZone: "Asia/Ho_Chi_Minh"});
    const d = new Date(asiaTime)
    return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()} ${d.getHours()}:${String(d.getMinutes()).padEnd(2, '0')}:${String(d.getSeconds()).padEnd(2, '0')} GMT+7`
}

const deadline = 1572602400000
const deadlineText = formatTime(deadline)

const getTop10 = (winningNumber, players) => {
    players = Object.entries(players).map(([address, p]) => (
        { address, ...p, delta: Math.abs(winningNumber - p.number)}
    ))

    return orderBy(players, ['delta', 'timestamp']).slice(0, 10)
}

@contract class LuckyBot extends SurveyBot {

    @state @view players = {}
    @state @view winningNumber

    @pure getName() {
        return `HAPPY ICETEA'S 1ST BIRTHDAY!`
    }

    @pure getDescription() {
        return `Choose your lucky number before ${deadlineText} to get a chance to win:</br>
        - 1 big mystery gift box for the Winner</br>
        - 5 Icetea T-shirts 2019 Edition for 5 Runner-ups
        `
    }

    @pure getCommands() {
        return [
            { text: 'Restart', value: 'start' },
            { text: 'My Number', value: 'mynumber', stateAccess: 'write' },
            { text: 'View Result', value: 'result', stateAccess: 'write'},
        ]
    }

    @transaction oncommand_mynumber() {
        const mynumber = this.players[msg.sender]
        if (!mynumber) {
            return Message.text('You did not participate yet.')
        }

        return Message.html(`Telegram: <b>@${mynumber.telegram}</b><br>
            Number: <b>${mynumber.number}</b></br>
            At: <b>${formatTime(mynumber.timestamp)}</b>
        `)
    }

    @transaction oncommand_result() {
        if (block.timestamp < deadline) {
            return Message.text(`Please wait until ${deadlineText}`)
        }

        if (this.winningNumber == null) {
            this.winningNumber = Math.round((Math.random() * 999))
        }
        const winners = getTop10(this.winningNumber, this.players)
        let reply = `Winning number: <b>${this.winningNumber}</b><br>
            Total participants: <b>${Object.keys(this.players).length}</b>`
        winners.forEach( ({ number, telegram, timestamp, delta }, index) => {
            reply += `<br>${index + 1}. <a href='https://t.me/{telegram}' target='_blank'>@${telegram}</a> - ${number} (±${delta}) - ${formatTime(timestamp)}`
        })

        return Message.html(reply)
    }

    getSteps() {
        return [
            'intro',
            {
                name: 'number',
                nextStateAccess: 'read',
            },
            {
                name: 'telegram',
                nextStateAccess: 'write',
            },
            'confirm'
        ]
    }

    intro() {
        if (block.timestamp > deadline) {
            return Message.text('This lucky draw is already closed.')
        }
        return Message
            .html('<b>NOTE</b><br/> The game is dedicated for member of Icetea Vietnam Telegram group @iceteachainvn only. Please join our group before entering this game.')
            .html('Step 1: Please Input a 3-digit number (Example: 001, 699...)')
            .input('nnn')

    }
    
    validate_number({ text, chatData }) {
        const value = text.trim()
        if (value.length !== 3 || !/\d\d\d/.test(value)) {
            throw new Error('Please input a valid number with 3 digits, e.g 012, 123.')
        }
        return chatData.number = value
    }

    retry_number({ error }) {
        return Message
            .text(error.message)
            .input('nnn')
    }

    after_number() {
        if (block.timestamp > deadline) {
            return Message.text('This lucky draw is already closed.')
        }
        return Message
            .html('Step 2: Please input your Telegram username.<br/>(Both <b>@username</b> or just <b>username</b> are accepted)')
            .input('@username')
    }

    validate_telegram({ text, chatData }) {
        let value = text.trim().toLowerCase()
        if (value.startsWith('@')) {
            value = value.slice(1)
        }

        if (!value) {
            throw new Error('Please input your telegram username. If you don\'t have one, please register.')
        }

        const [oldAddress, oldPlayer] = Object.entries(this.players).find(([address, p]) => (p.telegram === value)) || []
        if (oldAddress) {
            if (oldAddress !== msg.sender) {
                throw new Error(`Another user has claim to be @${value} and he/she picked number ${oldPlayer.number}. Please enter a different telegram username.`)
            } else {
                chatData.oldNumber = oldPlayer.number
            }
        }

        return chatData.telegram = value
    }

    retry_telegram({ error }) {
        return Message
            .text(error.message)
            .input('@username')
            .nextStateAccess('read')
    }

    after_telegram({ chatData }) {
        const { number, telegram, oldNumber } = chatData
        let reply = `Your lucky number: <b>${number}</b> <br>Your Telegram username: <b>@${telegram}</b>.`
        if (oldNumber) {
            reply += `<br><br>Your old number <b>${oldNumber}</b> will be overwritten.`
        }
        return Message.html(reply)
            .button('Confirm', 'confirm')
    }

    after_confirm({ chatData }) {
        const { number, telegram } = chatData
        this.players[msg.sender] = {
            number, telegram, timestamp: block.timestamp
        }

        return Message.text(`Thank you for your participation!<br/> The final results will be announced on Friday, ${deadlineText}. Good luck :D`)
    }
}
