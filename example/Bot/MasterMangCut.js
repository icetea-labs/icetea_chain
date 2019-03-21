import 'https://github.com/TradaTech/icetea/icetea/bot/Message.js'

@contract class MasterMangCut {

    botInfo = {
        name: 'Thầy Măng Cụt',
        description: 'Thầy Măng Cụt biết nhiều thứ, nhưng ông chỉ nói đủ.',
        ontext_type: 'transaction'
    }

    @state #conversations = {}

    @transaction ontext(text: string) {
        const who = msg.sender
        const cons = this.#conversations
        if (!cons[who]) {
            cons[who] = {
                stage: this.#STEP.STARTED
            }
        }
        const result = this.#proceed(text, cons[who])

        // save state back
        this.#conversations = cons

        return result
    }

    #proceed(text, state) {

        const { collect, succeed, fail } = this.#map[state.stage] || {}
        let collected
        if (collect) {
            collected = collect.call(this, text, state)
        }

        if (!collected || !collected.failed) {
            if ( succeed ) {
                if (state.stage === this.#STEP.HAD_HOUR) {
                    state.stage = this.#STEP.STARTED
                } else {
                    state.stage++
                }
                
                return succeed.call(this, collected && collected.data, state)
            }
        } else {
            if ( fail ) {
                return fail.call(this, text, state)
            }
        }
    }

    #STEP = {
        STARTED: 0, // started, next: show them terms
        ACCEPTED: 1, // term accepted, next: ask for name
        HAD_NAME: 2, // had name, next: ask for gender
        HAD_GENDER: 3, // had gender, next: ask for dob
        HAD_DOB: 4, // had dob, next: ask hour
        HAD_HOUR: 5, // had hour, next: show them result
    }

    #map = {
        [this.#STEP.STARTED]: {
            succeed() {
                return new Message('Kính chào quý khách. Tôi là <i>Thầy Măng Cụt</i>,' + 
                    ' chuyên hành nghề bói Tử Vi trên Icetea blockchain.', 'html')
                    .text('Nếu bạn muốn xem thì bấm nút phía dưới. Không muốn thì thôi.')
                    .button('Tôi là người Việt và sinh ở Việt Nam', 'start')
                    .done()
            }
        },
        [this.#STEP.ACCEPTED]: {
            succeed() {
                return new Message('Tốt quá. Vì tôi không biết xem cho người nước ngoài hoặc sinh ở nước ngoài.')
                    .text('Đầu tiên, hãy cho biết tên (bao gồm cả tên lót nếu nó là riêng của bạn)')
                    .input('Ngọc Trinh')
                    .done()
            }
        },
        [this.#STEP.HAD_NAME]: {
            collect(name, state) {
                state.name = this.#toTitleCase(name)
                return { data: state.name }
            },
            succeed(name) {
                return new Message(`OK ${name}. Còn giới tính?`)
                    .buttonRow()
                    .button('Name', 'male')
                    .button('Nữ', 'female')
                    .endRow()
                    .done()
            }
        },
        [this.#STEP.HAD_GENDER]: {
            collect(genderText, state) {
                state.gender = (genderText === 'male')
                return { data: state.gender }
            },
            succeed(name) {
                return new Message('Tiếp tục.')
                    .text('Ngày tháng năm sinh theo dạng ngày/tháng/năm.')
                    .input('dd/mm/yyyy')
                    .done()
            }
        },
        [this.#STEP.HAD_DOB]: {
            collect(dateString, state) {
                const dt = this.#parseDate(dateString)
                const failed = (dt === undefined)
                if (failed) {
                    return { failed }
                } else {
                    state.dob = dt
                    return { data: dt }
                }
            },
            succeed(dt) {
                return new Message('Date OK. TODO: hour!')
                    .done()
            },
            fail(dateString) {
                return new Message('Ngày nhập sai định dạng.')
                    .text('Ví dụ nhập đúng: 23/8/2001')
                    .input('dd/mm/yyyy')
                    .done()
            }
        }
    }

    #toTitleCase (str) {
        return str.replace(/\w\S*/g, function (txt) {
          return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
        })
    }

    #daysInMonth (m, y) {
        switch (m) {
            case 1 :
                return (y % 4 == 0 && y % 100) || y % 400 == 0 ? 29 : 28;
            case 8 : case 3 : case 5 : case 10 :
                return 30;
            default :
                return 31
        }
    }

    #isValidDate (d, m, y) {
        m = parseInt(m, 10) - 1;
        return m >= 0 && m < 12 && d > 0 && d <= this.#daysInMonth(m, y);
    }

    #parseDate(text) {
        const parts = text.trim().split('/')
        if (parts.length !== 3) {
          return undefined
        }
        const day = parseInt(parts[0])
        const month = parseInt(parts[1])
        let year = parseInt(parts[2])
      
        if (!this.#isValidDate(day ,month - 1, year)) {
            return undefined
        }
      
        return { day, month, year }
    }
}
