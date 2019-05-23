// To deploy from web, use https://raw.githubusercontent.com/TradaTech/botutils/master/index.js
// const { SurveyBot, Message } = require('icetea-botutils')

const Big = require('big.js')

class Message {
  constructor (text, t = 'text', options = {}) {
    this.messages = []
    text && this[t] && this[t](text, options)
  }
  done () {
    return {
      options: this.opts,
      messages: this.messages
    }
  }

  option (opts) {
    if (opts) {
      this.opts = Object.assign(this.opts || {}, opts)
    }
    return this
  }

  requestTransfer (value) {
    return this.option({ value })
  }

  push (message) {
    this.messages.push(message)
    return this
  }

  text (content, options = {}) {
    return this.push({
      type: 'text',
      content,
      ...options
    })
  }

  html (content, options = {}) {
    return this.push({
      type: 'html',
      content,
      ...options
    })
  }

  buttonRow () {
    const self = this
    const m = []
    const t = {
      button (text, value, options = {}) {
        if (!value) value = text
        m.push({
          text,
          value,
          ...options
        })
        return t
      },
      buttons (...values) {
        values.forEach(v => {
          m.push({ text: v, value: v })
        })
        return t
      },
      endRow () {
        return self.push({
          type: 'button',
          content: m
        })
      }
    }

    return t
  }

  button (text, value, options = {}) {
    if (!value) value = text
    return this.push({
      type: 'button',
      content: [{
        text,
        value,
        ...options
      }]
    })
  }

  input (placeholder, options = {}) {
    return this.push({
      type: 'input',
      content: {
        placeholder,
        ...options
      }
    })
  }

  select (placeholder, options = {}) {
    const self = this
    const m = {
      type: 'select',
      content: {
        placeholder,
        searchselect: false,
        multipleselect: false,
        button: {
          icon: 'check',
          label: 'OK'
        },
        options: [],
        ...options
      }
    }
    const t = {
      add (items) {
        if (!Array.isArray(items)) {
          items = [items]
        }
        items.forEach((item, index) => {
          if (typeof item === 'string') {
            m.content.options.push({ text: item, value: index })
          } else {
            m.options.push(item)
          }
        })
        return t
      },
      endSelect () {
        return self.push(m)
      }
    }

    return t
  }
}

Message.text = function (text, options) {
  return new Message(text, 'text', options)
}

Message.html = function (html, options) {
  return new Message(html, 'html', options)
}

Message.create = function () {
  return new Message()
}

const TEA_DECIMAL = 6
const TEA_TO_MICRO = 10 ** TEA_DECIMAL

class BaseSurveyBot {

  #chats = {}

  botInfo () {
    const info = {
      name: this.getName(),
      state_access: this.getStateAccess()
    }

    if (typeof this.getDescription === 'function') {
      info.description = this.getDescription()
    }

    if (typeof this.getCommands === 'function') {
      info.commands = this.getCommands()
    }

    return info
  }

  getName () {
    throw new Error('Bot has to implement getName')
  }

  getStateAccess() {
    return 'none'
  }

  getSteps () {
    throw new Error('Bot has to implement getSteps')
  }

  getChats () {
    return this.#chats
  }

  setChats (chats) {
    this.#chats = chats
    return chats
  }

  getStep (address) {
    const chats = this.getChats()
    return ((chats || {})[address] || {})._step || 0
  }

  oncommand (command) {
    const methodName = 'oncommand_' + command
    if (this[methodName]) {
      return this[methodName]()
    } else {
      return Message.html(`Command <b>${command}</b> is not supported by this bot.`).done()
    }
  }

  oncommand_start () {
    return this.start()
  }

  ontext (text) {
    try {
      const who = this.runtime.msg.sender
      const chats = this.getChats()
      if (!chats[who]) {
        chats[who] = {
          _step: 0
        }
      }
      const result = this.proceed(String(text), chats[who])

      // save state back
      this.setChats(chats)

      return result
    } catch (err) {
      return this.onerror(err)
    }
  }

  start() {
    const who = this.runtime.msg.sender
    const chats = this.getChats()
    if (chats[who]) {
      chats[who]._step = 0
    }
    return this.ontext()
  }

  proceed (data, collector) {
    if (!collector) {
      throw new Error('Collector is required.')
    }
    const steps = this.getSteps()
    if (!steps || !steps.length) {
      throw new Error('Steps is required.')
    }

    if (collector._step < 0 || collector._step >= steps.length) {
      throw new Error('Invalid step.')
    }
    const stepName = String(steps[collector._step])

    let value
    try {
      value = this.collect(data, collector, stepName)
    } catch (error) {
      return this.fail(data, collector, error, stepName)
    }

    if (collector._step >= steps.length - 1) {
      collector._step = 0
    } else {
      collector._step++
    }
    return this.succeed(value, collector, stepName)
  }

  collect (data, collector, stepName) {
    const methodName = 'collect_' + stepName
    if (this[methodName]) {
      return this[methodName](data, collector)
    }
  }

  succeed (value, collector, stepName) {
    const methodName = 'succeed_' + stepName
    if (this[methodName]) {
      return this[methodName](value, collector)
    }
  }

  fail (data, collector, error, stepName) {
    const methodName = 'fail_' + stepName
    if (this[methodName]) {
      return this[methodName](data, collector, error)
    }
  }

  onerror (err) {
    throw err
  }

  toUnit (tea) {
    return new Big(String(tea)).times(TEA_TO_MICRO).toFixed()
  }

  toTEA (unit) {
    return new Big(String(unit)).div(TEA_TO_MICRO).toString()
  }
}

class MemoirSurveyBot extends BaseSurveyBot {

  getStateAccess() {
    return 'write'
  }

  getStorageKey () {
    return 'chats'
  }

  getChats () {
    return this.getState(this.getStorageKey(), {})
  }

  setChats (chats) {
    return this.setState(this.getStorageKey(), chats)
  }
}


const DiceTypes = [{
  rate: 5,
  sides: 6,
  maxBet: 5000000n
}, {
  rate: 1.8,
  sides: 2,
  maxBet: 5000000n
}]

@contract class DiceBot extends MemoirSurveyBot {

  @state #diceType = 0
  #dice = () => DiceTypes[this.#diceType]

  @pure getName() {
    return 'Dice Bot'
  }

  @pure getDescription() {
    return 'Play dice game.'
  }

  @pure getCommands() {
    return [
      { text: 'Restart', value: 'start' },
      { text: 'Dice (6 sides)', value: 'dice6' },
      { text: 'Dice (2 sides)', value: 'dice2' },
      { text: 'Help', value: 'help' },
    ]
  }

  @pure getSteps() {
    return ['intro', 'number', 'amount', 'confirm']
  }

  oncommand_dice6() {
    this.#diceType = 0
    return this.start()
  }

  oncommand_dice2() {
    this.#diceType = 1
    return this.start()
  }

  oncommand_help() {
    const s = this.getStep(msg.sender)
    let t
    switch (s) {
      case 0:
        t = 'Just click Start button, don\'t worry.'
        break
      case 1:
        t = 'Pick a number, any number.'
        break
      case 2:
        t = 'The amount of tea you want to bet.'
        break
      case 3:
        t = 'Just confirm the transfer.'
        break
      default:
        t = 'Select a number and bet. It is easy!'
        break
    }
    return Message.html(t, { cssClass: 'bot-help' }).done()
  }

  succeed_intro() {
    const m = Message
    .text(`If you bet 1 TEA and guess the number correctly, I will transfer ${this.#dice().rate} TEA back to you. `)
    .text('Pick your number.')
    .buttonRow()

    const sides = this.#dice().sides
    for (let i = 1; i <= sides; i++) {
      m.button(String(i))
    }

    return m.endRow().done()
  }

  collect_number(number, collector) {
    return collector.number = number
  }

  succeed_number(number) {
    const max = this.#getMaxBet()
    const tea = this.toTEA(max)
    return Message.text(`You picked ${number}.`)
      .text(`How much you want to bet (maximum ${tea} TEA)?`)
      .input('Bet amount', {
        value: tea,
        sub_type: 'text'
      })
      .done()
  }

  collect_amount(amount, collector) {
    amount = this.toUnit(+amount)
    if (amount <= 0 || amount > this.#getMaxBet()) {
      throw new Error('Invalid bet amount')
    }
    return collector.amount = +amount
  }

  fail_amount(amount) {
    const max = this.#getMaxBet()
    const tea = this.toTEA(max)
    return Message.text(`Invalid amount ${amount}. Please enter a valid amount (maximum ${tea} TEA).`)
      .input('Bet amount', {
          value: tea,
          sub_type: 'text'
        })
      .done()
  }

  succeed_amount(amount, collector) {
    collector.state_access = 'write' // after state access of this step
    const tea = this.toTEA(amount)
    return Message.html(`Your picked number: <b>${collector.number}</b><br>Your bet amount: <b>${tea}</b> TEA.`)
      .button('Confirm', 'confirm')
      .requestTransfer(amount)
      .done()
  }

  succeed_confirm(confirm, collector) {
    collector.state_access = 'read'
    const r = this.#randomize()
    const win = (r === +collector.number)
    const receiveAmount = win ? BigInt(new Big(msg.value.toString()).times(this.#dice().rate)) : 0n
    if (receiveAmount) {
      this.transfer(msg.sender, receiveAmount)
    }
    return Message.html(`DICE RESULT: <b>${r}</b><br>
      You guess: ${collector.number} => <b>YOU ${win ? 'WIN' : 'LOSE'}</b><br>
      You sent: <b>${this.toTEA(msg.value)}</b> TEA<br>
      You received: <b>${this.toTEA(receiveAmount)}</b> TEA.`)
      .button('Play Again', 'start')
      .done()
  }

  #randomize = () => {
    return parseInt(block.hash.substr(-16), 16) % this.#dice().sides + 1
  }

  #getMaxBet = () => {
    const { rate, maxBet } = this.#dice()
    const afforable = BigInt(new Big(this.balance).div(rate - 1).toString())
    return afforable > maxBet ? maxBet : afforable
  }
}
