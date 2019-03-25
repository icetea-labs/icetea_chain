const { SurveyBot, Message } = require('https://github.com/TradaTech/icetea/icetea/bot/index.js')
const helper = require('https://github.com/TradaTech/icetea/example/astrobot/helper.js')
const { toLunar } = require('https://github.com/TradaTech/icetea/example/astrobot/lunar.js')

@contract class AstroBot extends SurveyBot {

    @pure getName() {
        return 'Thầy Măng Cụt'
    }

    @pure getDescription() {
        return 'Thầy Măng Cụt biết nhiều thứ, nhưng ông chỉ nói đủ.'
    }

    @pure getSteps() {
        return ['Boarding', 'Terms', 'Name', 'Gender', 'Dob', 'Hour']
    }

    succeedBoarding() {
        return Message.html('Kính chào quý khách. Tôi là <i>Thầy Măng Cụt</i>,' + 
            ' chuyên hành nghề bói Tử Vi trên Icetea blockchain.', 'html')
            .text('Nếu bạn muốn xem thì bấm nút phía dưới. Không muốn thì thôi.')
            .button('Tôi là người Việt và sinh ở Việt Nam', 'start')
            .done()
    }

    succeedTerms() {
        return Message.text('Tốt quá. Vì tôi không biết xem cho người nước ngoài hoặc sinh ở nước ngoài.')
            .text('Đầu tiên, hãy cho biết tên (bao gồm cả tên lót nếu nó là riêng của bạn)')
            .input('Ngọc Trinh')
            .done()
    }

    collectName(name, collector) {
        collector.name = helper.toTitleCase(name)
        return collector.name
    }

    succeedName(name) {
        return Message.text(`OK ${name}. Còn giới tính?`)
            .buttonRow()
            .button('Nam', 'male')
            .button('Nữ', 'female')
            .endRow()
            .done()
    }

    collectGender(genderText, collector) {
        collector.gender = (genderText === 'male')
        return collector.gender
    }

    succeedGender() {
        return Message.text('Tiếp tục.')
            .text('Ngày tháng năm sinh theo dạng ngày/tháng/năm.')
            .input('dd/mm/yyyy')
            .done() 
    }

    collectDob(dateString, collector) {
        collector.dob = helper.parseDate(dateString)
        return collector.dob
    }

    succeedDob({ day, month, year}) {
        return Message.text('Đó là ' + helper.toLunarString(toLunar(day, month, year)))
            .text('Hãy chọn giờ sinh theo múi giờ GMT+7. Nhớ là múi giờ GMT+7.')
            .select('Chọn giờ sinh')
            .add([
                '0am ~ 1am',
                '1am ~ 3am',
                '3am ~ 5am',
                '5am ~ 7am',
                '7am ~ 9am',
                '9am ~ 11am',
                '11am ~ 1pm',
                '1pm ~ 3pm',
                '3pm ~ 5pm',
                '5pm ~ 7pm',
                '7pm ~ 9pm',
                '9pm ~ 11pm',
                '11pm ~ 12pm'
            ])
            .endSelect()
            .done()
    }

    failDob(data, collector, error) {
        console.log(data, collector, error)
        return Message.text('Ngày nhập sai định dạng.')
            .text('Ví dụ nhập đúng: 23/8/2001')
            .input('dd/mm/yyyy')
            .done()
    }

    collectHour(hour, collector) {
        collector.hour = hour
        return hour
    }

    succeedHour(hour, collector) {
        return Message.text('Đợi thầy tí.')
            .text('Phần luận giải thầy lại chưa code :(', { loading: true, delay: 1000 })
            .done()
    }
}
