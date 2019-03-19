import Vue from 'vue'
import BotUI from 'botui'
import { convertSolar2Lunar } from './lunar'

const STEMS =
    ['Giáp', 'Ất', 'Bính', 'Đinh', 'Mậu',
      'Kỷ', 'Canh', 'Tân', 'Nhâm', 'Quý']
const BRANCHES =
    ['Tý', 'Sửu', 'Dần',
      'Mão', 'Thìn', 'Tị',
      'Ngọ', 'Mùi', 'Thân',
      'Dậu', 'Tuất', 'Hợi']

let data

const start = () => {
  data = {}
}

const say = (text, options) => {
  botui.message.add(Object.assign({ content: String(text) }, options || {}))
}

const toLunarString = lunar => {
  return `ngày ${lunar.day} tháng ${lunar.month} ${lunar.leapMonth ? '(nhuận) ' : ''} năm ${STEMS[lunar.year.stem]} ${BRANCHES[lunar.year.branch]}`
}

const parseDate = text => {
  const parts = text.trim().split('/')
  if (parts.length !== 3) {
    return undefined
  }
  const day = parseInt(parts[0])
  const month = parseInt(parts[1])
  let year = parseInt(parts[2])
  if (year < 100) {
    const currentYY = new Date().getFullYear() - 2000
    year += (year <= currentYY ? year + 2000 : year + 1900)
  }

  const date = new Date(year, month - 1, day)

  if (isNaN(date.getTime()) ||
        day !== date.getDate() ||
        month !== date.getMonth() + 1 ||
        year !== date.getFullYear()) {
    return undefined
  }

  return { day, month, year }
}

const askDob = async () => {
  say('Ngày tháng năm sinh theo dạng ngày/tháng/năm.')
  const { value } = await botui.action.text({
    action: {
      placeholder: 'dd/mm/yyyy'
    }
  })

  const dt = parseDate(value)
  if (dt) {
    return dt
  } else {
    say('Sai định dạng.')
    return askDob()
  }
}

const botui = BotUI('my-botui-app', {
  vue: Vue
})

start()
botui.message.add({
  type: 'html',
  content: 'Kính chào quý khách. Tôi là <i>Thầy Măng Cụt</i>, chuyên hành nghề bói Tử Vi trên mạng phi tập trung của Trà Đá Công Nghệ.'
})
  .then(function () {
    say('Nếu bạn muốn xem thì bấm nút phía dưới. Không muốn thì thôi.')
    return botui.action.button({
      action: [
        {
          text: 'Tôi là người Việt và sinh ở Việt Nam',
          value: 'start'
        }
      ]
    })
  })
  .then(function () {
    say('Tốt quá. Vì tôi không biết xem cho người nước ngoài hoặc sinh ở nước ngoài.')
    say('Đầu tiên, hãy cho biết tên (bao gồm cả tên lót nếu nó là riêng của bạn)')
    return botui.action.text({
      action: {
        placeholder: 'Ngọc Trinh'
      }
    })
  })
  .then(function ({ value }) {
    data.name = value.trim()
    say(`OK ${data.name}. Còn giới tính?`)
    return botui.action.button({
      action: [
        {
          text: 'Nam',
          value: 'male'
        },
        {
          text: 'Nữ',
          value: 'female'
        }
      ]
    })
  })
  .then(function ({ value }) {
    data.gender = value
    say('Tiếp tục.')
    return askDob()
  })
  .then(function (dt) {
    data.solar = dt
    const lunar = convertSolar2Lunar(dt.day, dt.month, dt.year)
    data.lunar = lunar
    say('Đó là ' + toLunarString(lunar))
    say('Hãy chọn giờ sinh theo múi giờ GMT+7. Nhớ là múi giờ GMT+7.')
    return botui.action.select({
      action: {
        placeholder: 'Chọn giờ sinh',
        searchselect: false,
        options: [
          { value: '0', text: '0am ~ 1am' },
          { value: '1', text: '1am ~ 3am' },
          { value: '2', text: '3am ~ 5am' },
          { value: '3', text: '5am ~ 7am' },
          { value: '4', text: '7am ~ 9am' },
          { value: '5', text: '9am ~ 11am' },
          { value: '6', text: '11am ~ 1pm' },
          { value: '7', text: '1pm ~ 3pm' },
          { value: '8', text: '3pm ~ 5pm' },
          { value: '9', text: '5pm ~ 7pm' },
          { value: '10', text: '7pm ~ 9pm' },
          { value: '11', text: '9pm ~ 11pm' },
          { value: '12', text: '11pm ~ 12pm' }
        ],
        button: {
          icon: 'check',
          label: 'OK'
        }
      }
    })
  })
  .then(function ({ value }) {
    data.hour = value
    say('Đợi thầy tí.')
    say('Phần luận giải thầy lại chưa code :(', { loading: true, delay: 1000 })
  })
