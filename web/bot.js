import Vue from 'vue'
import BotUI from 'botui'

const say = (text, options) => {
  botui.message.add(Object.assign({ content: text }, options || {}))
}

const parseDate = text => {
  const parts = text.trim().split('/')
  if (parts.length !== 3) {
    return undefined
  }
  const day = parseInt(parts[0])
  const month = parseInt(parts[1])
  const year = parseInt(parts[2])

  const date = new Date(year, month - 1, day)
  if (isNaN(date.getTime()) ||
     day !== date.getDay() ||
     month !== date.getMonth() + 1 ||
     year !== date.getFullYear()) {
    return undefined
  }

  return { day, month, year }
}

const botui = BotUI('my-botui-app', {
  vue: Vue
})

botui.message.add({
  loading: true,
  delay: 500,
  type: 'html',
  content: 'Kính chào quý khách. Tôi là <i>Thầy Măng Cụt</i>, chuyên hành nghề bói Tử Vi trên mạng phi tập trung của Trà Đá Công Nghệ.'
}).then(function () {
  say('CHÚ Ý: tôi chỉ xem cho người Việt và sinh tại Việt Nam.')
  say('Nếu bạn muốn xem thì bấm nút phía dưới. Không muốn thì thôi.')
  return botui.action.button({
    action: [
      {
        text: 'Tôi sinh ở Việt Nam',
        value: 'start'
      }
    ]
  })
}).then(function () {
  botui.message.add({
    content: 'Đầu tiên, hãy cho tôi biết tên (bao gồm cả tên lót nếu nó là riêng của bạn)'
  })
  return botui.action.text({
    action: {
      placeholder: 'Ngọc Trinh'
    }
  })
}).then(function (res) {
  botui.message.add({
    content: `OK ${res.value.trim()}. Tiếp tục. Ngày tháng năm sinh theo dạng ngày/tháng/năm.`
  })
  return botui.action.text({
    action: {
      placeholder: 'dd/mm/yyyy'
    }
  })
}).then(function (res) {
  if (parseDate(res.value)) {
    say('Good date!')
  } else {
    say('Invalid date!')
  }
})
