function toTitleCase(str) {
    return str.replace(/\w\S*/g, function (txt) {
        return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
    })
}

function daysInMonth(m, y) {
    switch (m) {
        case 1:
            return (y % 4 == 0 && y % 100) || y % 400 == 0 ? 29 : 28;
        case 8: case 3: case 5: case 10:
            return 30;
        default:
            return 31
    }
}

function isValidDate(d, m, y) {
    m = parseInt(m, 10) - 1;
    return m >= 0 && m < 12 && d > 0 && d <= daysInMonth(m, y);
}

function parseDate(text) {
    const parts = text.trim().split('/')
    if (parts.length !== 3) {
        throw new Error('Must have 3 part: day/month/year')
    }
    const day = parseInt(parts[0])
    const month = parseInt(parts[1])
    let year = parseInt(parts[2])

    if (!isValidDate(day, month, year)) {
        throw new Error('Date does not exist.')
    }

    return { day, month, year }
}

const STEMS =
    ['Giáp', 'Ất', 'Bính', 'Đinh', 'Mậu',
        'Kỷ', 'Canh', 'Tân', 'Nhâm', 'Quý']
const BRANCHES =
    ['Tý', 'Sửu', 'Dần',
        'Mão', 'Thìn', 'Tị',
        'Ngọ', 'Mùi', 'Thân',
        'Dậu', 'Tuất', 'Hợi']

function toLunarString(lunar) {
    return `ngày ${lunar.day} tháng ${lunar.month} ${lunar.leapMonth ? '(nhuận) ' : ''} năm ${STEMS[lunar.year.stem]} ${BRANCHES[lunar.year.branch]}`
}

module.exports = { toTitleCase, parseDate, toLunarString }