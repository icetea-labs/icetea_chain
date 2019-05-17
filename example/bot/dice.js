const { SurveyBot, Message } = require('https://raw.githubusercontent.com/TradaTech/icetea/master/icetea/bot/index.js?token=AHWKRP3ZBMOICP3OXJB4J5K44PMK2')

const RATE = 5
const MAX = 6
const MAX_BET = 5

@contract class DiceBot extends SurveyBot {
  @pure getName() {
    return 'Dice Bot'
  }

  @pure getDescription() {
    return 'Play dice game.'
  }

  @pure getCommands() {
    return [
      { title: this.botInfo().start_button || 'Start', value: 'start' },
      { title: 'Description', value: 'desc' }, 
      { title: 'Name', value: 'name' },
      { title: 'State Access', value: 'state_access' }
    ]
  }

  oncommand (value) {
    if(value === 'start') {
      const who = this.getEnv().msg.sender
      const chats = this.getChats()
      if (chats[who]) {
        chats[who]._step = 0
      }
      return this.ontext()
    }
    if(value === 'desc') {
      return Message.text(this.getDescription())
        .done()
    }
    if(value === 'name') {
      return Message.text(this.getName())
        .done()
    }
    if(value === 'state_access') {
      return Message.text(this.botInfo().state_access)
        .done()
    }
    return Message.text(`command value ${value} not found`)
      .done()
  }

  @pure getSteps() {
    return ['Starting','Number', 'Amount', 'Confirm']
  }

  succeedStarting() {
    const m = Message
    .text(`If you bet 1 TEA and guess the number correctly, I will transfer ${RATE} TEA back to you. `)
    .text('Pick your number.')
    .buttonRow()

    for (let i = 1; i <= MAX; i++) {
      m.button(String(i))
    }

    return m.endRow().done()
  }

  collectNumber(number, collector) {
    return collector.number = number
  }

  succeedNumber(number) {
    const max = this.#getMaxBet()
    return Message.text(`You picked ${number}.`)
      .text(`How much you want to bet (maximum ${max} TEA)?`)
      .input('Bet amount', {
        value: parseInt(max),
        sub_type: 'number'
      })
      .done()
  }

  collectAmount(amount, collector) {
    amount = +amount
    if (amount <= 0 || amount > this.#getMaxBet()) {
      throw new Error('Invalid bet amount')
    }
    return collector.amount = +amount
  }

  failAmount(amount) {
    const max = this.#getMaxBet()
    return Message.text(`Invalid amount ${amount}. Please enter a valid amount (maximum ${max} TEA).`)
      .input('Bet amount', {
          value: parseInt(max),
          sub_type: 'number'
        })
      .done() 
  }

  succeedAmount(amount, collector) {
    collector.state_access = 'write' // after state access of this step
    return Message.html(`Your picked number: <b>${collector.number}</b><br>Your bet amount: <b>${amount}</b> TEA.`)
      .button('Confirm', 'confirm')
      .requestTransfer(amount)
      .done()
  }

  succeedConfirm(confirm, collector) {
    collector.state_access = 'read'
    const r = this.#randomize()
    const win = (r === +collector.number)
    const receiveAmount = win ? Number(msg.value) * RATE : 0
    if (receiveAmount) {
      this.transfer(msg.sender, receiveAmount)
    }
    return Message.html(`DICE RESULT: <b>${r}</b><br>
      You guess: ${collector.number} => <b>YOU ${win ? 'WIN' : 'LOSE'}</b><br>
      You sent: <b>${msg.value}</b> TEA<br>
      You received: <b>${receiveAmount}</b> TEA.`)
      .done()
  }

  #randomize = () => {
    return parseInt(block.hash.substr(-16), 16) % MAX + 1
  }

  #getMaxBet = () => {
    return Math.min(Number(this.balance) / (RATE - 1), MAX_BET)
  }
}
