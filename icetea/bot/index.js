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
            m.options.push({ text: item, value: index })
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

exports.InputCollectionSteps = class {
  getSteps () {
    throw new Error('Not implemented')
  }

  proceed (data, collector, stepKey = 'step') {
    const steps = this.getSteps()
    const stepName = steps[collector[stepKey]]

    try {
      const value = this.collect(data, collector, stepName)
      if (collector[stepKey] === steps.length - 1) {
        collector[stepKey] = 0
      } else {
        collector[stepKey]++
      }
      return this.succeed(value, collector, stepName)
    } catch (error) {
      return this.fail(data, collector, error, stepName)
    }
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
}
