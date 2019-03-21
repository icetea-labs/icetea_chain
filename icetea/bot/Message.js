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

  select () {
    return this
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
