const { Message } = require('@iceteachain/utils')
const coins = ['BTC', 'ETH', 'XRP', 'EOS', 'KNC', 'TOMO']

const showMenu = m => {
    return (m || Message.text('Click a coin to see its current price.'))
        .buttons(...coins).nextStateAccess('write')
}

const format = (n, locale) => (+n).toLocaleString(locale || 'en-US')

@contract class CoinPriceBot {
    @pure botInfo = {
        name: 'Coin price bot',
        description: 'It tells you the price of well-known coins.'
    }

    @pure oncommand() {
        return showMenu()
    }

    @transaction ontext(symbol: string, { locale }) {
        const gate = loadContract('system.gate')
        const requestId = gate.request.invokeUpdate({
            path: 'query/finance/crypto/rate',
            data: { symbol }
        }, { locale })

        return Message.sendLoading(requestId)
    }

    @transaction onOffchainData(requestId, input, result) {
        if (msg.sender === 'system.gate') {
            const symbol = input.data.symbol
            const locale = input.options?.locale
            const u = result.data.USD
            const m = Message.text(`${symbol}: ${format(u.price, locale)}$ (${format(u.percent_change_24h, locale)}%)`)
            this.emitEvent(requestId, showMenu(m))
        }
    }
}
