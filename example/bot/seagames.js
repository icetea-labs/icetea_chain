const { SurveyBot, Message } = require("@iceteachain/utils");
const { orderBy } = require("lodash");
const createHash = require("create-hash");

const formatTime = ms => {
  const asiaTime = new Date(ms).toLocaleString("en-US", {
    timeZone: "Asia/Ho_Chi_Minh"
  });
  const d = new Date(asiaTime);
  return `${d.getDate()}/${d.getMonth() +
    1}/${d.getFullYear()} ${d.getHours()}:${String(d.getMinutes()).padStart(
    2,
    "0"
  )}:${String(d.getSeconds()).padStart(2, "0")} GMT+7`;
};

const deadline = 1574931600000;
const deadlineText = formatTime(deadline);

const validatePhoneNumber = phone => {
  phone = phone.normalize().trim()
  if (!/^0[35789]\d{8}$/.test(phone)) {
    throw new Error('Số điện thoại có vẻ không đúng. Bạn nhập đủ 10 số viết liền theo định dạng 03x, 05x, 07x, 08x hoặc 09x mới ok.')
  }
  return phone
}

const maskPhone = phone => {
  return 'x'.repeat(7) + phone.substr(-3)
}

const hashPhone = phone => {
    return createHash("sha256")
      .update(phone, "hex")
      .digest("base64"); 
}

const formatOldGuess = old => {
  return `${old.host} - ${old.visitor}, số may mắn ${old.number}`
}

const formatSummary = chatData => {
  let msg = `Kiểm tra lại thông tin, nếu chuẩn rồi <b>hãy bấm Xác nhận</b>.<br><br>
  Tỉ số: Việt Nam ${chatData.host} - Lào ${chatData.visitor}<br>
  Số may mắn: ${chatData.number}<br>
  Tên (bảo mật): ${chatData.name}<br>
  Điện thoại (bảo mật): ${chatData.phone}`
  if (chatData.oldGuess) {
    msg += `<br><br>
    Thông tin lần đoán trước (${formatOldGuess(chatData.oldGuess)}) sẽ bị ghi đè.`
  }

  msg += '<br><br>Quên bấm Xác nhận kết quả sẽ không được ghi nhận.'

  return msg
}

const getTop = ({ host, visitor, winningNumber }, players, topCount = 10) => {
  players = Object.entries(players)
    .filter(([, p]) => (+p.host === host && +p.visitor === visitor))
    .map(([address, p]) => ({
    address,
    ...p,
    delta: Math.abs(winningNumber - p.number)
  }));

  return orderBy(players, ["delta", "timestamp"]).slice(0, topCount);
};

@contract
class LuckyBot extends SurveyBot {
  @state @view players = {};
  @state @view winningNumber;
  @state @view result
  @state @view admins

  @state @view publicKey = 'cStHMto8vNjeoySikZkS2dUAWjpqZkGQezvVh2mys7t5'

  constructor() {
    this.admins = [this.deployedBy]
  }

  @pure getName() {
    return 'DỰ ĐOÁN SEAGAMES CÙNG SKYGARDEN!';
  }

  @pure getDescription() {
    return `Dự đoán kết quả các trận đấu của tuyển bóng đá Việt Nam ở Sea Games để nhận nhiều phần quà.</br>
        - 10 pack beer tươi Người Yêu Cũ cho 10 người dự đoán chuẩn nhấtnhất</br>
        - 1 Áo phông Icetea đẹp kinh hoàng cho giải nhất
        `;
  }

  @pure getCommands() {
    return [
      { text: "Chơi lại", value: "start" },
      { text: "Xem lại", value: "mine", stateAccess: "write" },
      { text: "Kết quả", value: "result", stateAccess: "write" }
    ];
  }

  expectAdmin() {
    if (!this.admins.includes(msg.sender)) {
      throw new Error('Unauthorized')
    }
  }

  @transaction addAdmin(addr: address) {
    this.expectAdmin()
    this.admins.push(addr)
  }

  @transaction setResult(host: number, visitor: number) {
    this.expectAdmin()
    this.result = { host, visitor, winningNumber: Math.round(Math.random() * 999)}
  }

  @transaction oncommand_mine() {
    const mine = this.players[msg.sender];
    if (!mine) {
      return Message.text("Bạn chưa dự đoán");
    }

    return Message.html(`Tỉ số: <b>${mine.host} - ${mine.visitor}</b><br>
            Số may mắn: <b>${mine.number}</b></br>
            Thời điểm dự đoán: <b>${formatTime(mine.timestamp)}</b>
        `);
  }

  @view oncommand_result() {
    if (!this.result || this.result.winningNumber == null) {
      return Message.text('Chưa có kết qủa.');
    }

    const winners = getTop(this.result, this.players, 10);

    const { host, visitor, winningNumber } = this.result
    let reply = `Tỉ số: <b>${host} - ${visitor}</b><br>
            Số may mắn ngẫu nhiên: <b>${winningNumber}</b><br>
            Số người tham dự: <b>${Object.keys(this.players).length}</b><br>
            Số người trúng giải: <b>${winners.length}</b>`;
    winners.forEach(({ number, markPhone, host, visitor, timestamp, delta }, index) => {
      reply += `<br>${index + 1}. ${markPhone} - ${host} : ${visitor} - ${number} (±${delta}) - ${formatTime(timestamp)}`;
    });

    return Message.html(reply);
  }

  getSteps() {
    return [
      "intro",
      {
        name: "match",
        nextStateAccess: "read"
      },
      {
        name: "host",
        nextStateAccess: "read"
      },
      {
        name: "visitor",
        nextStateAccess: "read"
      },
      {
        name: "number",
        nextStateAccess: "read"
      },
      {
        name: "name",
        nextStateAccess: "read"
      },
      {
        name: "phone",
        nextStateAccess: "write"
      },
      "confirm"
    ];
  }

  intro() {
    if (block.timestamp > deadline) {
      return Message.text('Dự đoán cho trận này đã đóng. Chờ trận tiếp theo.');
    }
    return Message
      .html('Chọn trận đấu')
      .button('Việt Nam - Lào', 'vie_lao')
  }

  after_match() {
    return Message.html('Đoán xem Việt Nam sẽ ghi mấy bàn?').buttons('0', '1', '2', '3', '4', '5', '6', '7', '10', '69')
  }

  after_host() {
    return Message.html('Có vẻ chuẩn :D, thế còn Lào ghi mấy trái?').buttons('0', '1')
  }

  after_visitor() {
    return Message.html('Haha! Giờ bạn phải chọn số may mắn có 3 chữ số (0 ~ 999), để <b>NẾU</b> có quá nhiều người cùng đoán đúng thì sẽ quay số').input('nnn')
  }

  validate_number({ text, chatData }) {
    const value = text.trim();
    if (!/^\d{1,3}$/.test(value)) {
      throw new Error(
        "Không hợp lệ rồi. Bạn phải nhập số nguyên trong khoảng 0 ~ 999, ví dụ: 0, 1, 12, 123."
      );
    }
    return (chatData.number = value);
  }

  retry_number({ error }) {
    return Message.text(error.message).input("nnn");
  }

  after_number() {
    return Message.html(
      "Tên bạn là gì?<br>(để tiện xưng hô khi trúng giải, thông tin này được bảo mật)"
    ).input("Anh Loành");
  }

  validate_name({ text, chatData }) {
    const name = text.normalize().trim()
    if (!name) {
      throw new Error('Bạn điền tên đi...')
    }

    return ( chatData.name = name.split(' ').map(w => w[0].toUpperCase() + w.substr(1).toLowerCase()).join(' ') )
  }

  after_name( {chatData} ) {
    return Message.html(`<b>${chatData.name}</b> cho xin số di động để liên lạc khi trúng giải nhé (thông tin này được bảo mật)`)
      .input('0xx')
  }

  validate_phone({ text, chatData }) {
    const phone = validatePhoneNumber(text)
    const hash = hashPhone(phone)

    const [oldAddress, oldPlayer] =
      Object.entries(this.players).find(
        ([, p]) => p.hashPhone === hash
      ) || [];

    if (oldAddress) {
      if (oldAddress !== msg.sender) {
        throw new Error(
          `Đã có người dùng khác điền số điện thoại này. Bạn hãy điền số điện thoại khác. Nếu chính là bạn và muốn dự đoán lại, hãy vào lại bằng trình duyệt khi trước.`
        );
      } else {
        // backup
        chatData.oldGuess = { host: oldPlayer.host, visitor: oldPlayer.visitor, number: oldPlayer.number }
      }
    }

    chatData.phone = phone
    chatData.maskPhone = maskPhone(phone)
    chatData.hashPhone = hash

    return phone
  }

  retry_phone({ error }) {
    return Message.text(error.message)
      .input("0xx")
      .nextStateAccess("read");
  }

  after_phone({ chatData }) {
    if (block.timestamp > deadline) {
      return Message.text('Chán quá, đã quá giờ dự đoán. Chờ kết quả');
    }

    const reply = formatSummary(chatData)
    return Message.html(reply,  { cssClass: 'bot-confirm' }).button("Xác nhận", "confirm")
    .requestEncryption(this.publicKey, ['name', 'phone'])
  }

  after_confirm({ chatData }) {
    const chat = { ...chatData }
    delete chat._step
    chat.timestamp = block.timestamp
    this.players[msg.sender] = chat

    return Message.text(
      `Ngon rồi. Đợi đến ${deadlineText} sẽ có kết quả nha. Chúc bạn may mắn lần này.`
    );
  }
}
