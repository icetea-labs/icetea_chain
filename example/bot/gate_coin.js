const { Message } = require('@iceteachain/utils')
const coins = ['BTC', 'ETH', 'XRP', 'EOS', 'KNC', 'TOMO']

const showMenu = old => {
    old = old || new Message()
    const m = old.text('Click a coin to see current price.').buttonRow()
    coins.forEach(c => {
        m.button(c, c)
    })
    return m.endRow().nextStateAccess('write').done()
}

const format = n => {
    return (+n).toLocaleString('en-US')
}

@contract class CoinPriceBot {
    @pure botInfo = {
        name: 'Coin price bot',
        description: 'It tells you the price of well-known coins.',
        stateAccess: 'none'
    }

    @pure oncommand() {
        return showMenu()
    }

    @transaction ontext(symbol: string) {
        const gate = loadContract('system.gate')
        const requestId = gate.request.invokeUpdate({
            path: 'query/finance/crypto/rate',
            data: { symbol }
        })

        // type cannot be changed so we set to html
        return Message.sendLoading(requestId, { type: 'html' })
    }

    @transaction onOffchainData(requestId, input, result) {
        if (msg.sender === 'system.gate') {
            const symbol = input.data.symbol
            const u = result.data.USD
            const m = Message.html(`Current price for <b>${symbol}</b><br>
                --------------------<br>
                Price: <b>${format(u.price)}</b>$<br>
                24H Change: <b>${format(u.percent_change_24h)}</b>%<br><br>
                <i>Source: ${result.source}</i>`)
            this.emitEvent(requestId, showMenu(m))
        }
    }
}
