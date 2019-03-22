class Message {
  constructor (text, t = 'text') {
    this.messages = []
    text && this[t] && this[t](text)
  }
  done () {
    return this.messages
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
      button (text, value, options) {
        m.push({
          text,
          value,
          ...options
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

Message.text = function (text) {
  return new Message(text)
}

Message.html = function (html) {
  return new Message(html, 'html')
}

Message.create = function () {
  return new Message()
}

exports.Message = Message

exports.SurveyBot = class {
  botInfo () {
    return {
      name: this.getName(),
      description: typeof this.getDescription === 'function' ? this.getDescription() : '',
      ontext_type: 'transaction'
    }
  }

  getName () {
    throw new Error('Bot has to implement getName')
  }

  getSteps () {
    throw new Error('Bot has to implement getSteps')
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

  getStep (address) {
    const chats = this.getChats()
    return ((chats || {})[address] || {})._step || 0
  }

  ontext (text) {
    try {
      const who = this.getEnv().msg.sender
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
      return this.onError(err)
    }
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
      if (collector._step === steps.length - 1) {
        collector._step = 0
      } else {
        collector._step++
      }
    } catch (error) {
      return this.fail(data, collector, error, stepName)
    }
    return this.succeed(value, collector, stepName)
  }

  collect (data, collector, stepName) {
    const methodName = 'collect' + stepName
    if (this[methodName]) {
      return this[methodName](data, collector)
    }
  }

  succeed (value, collector, stepName) {
    const methodName = 'succeed' + stepName
    if (this[methodName]) {
      return this[methodName](value, collector)
    }
  }

  fail (data, collector, error, stepName) {
    const methodName = 'fail' + stepName
    if (this[methodName]) {
      return this[methodName](data, collector, error)
    }
  }

  onError (err) {
    throw err
  }
}
