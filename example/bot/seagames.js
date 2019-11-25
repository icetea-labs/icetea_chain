const { SurveyBot, Message } = require("@iceteachain/utils");
const { orderBy } = require("lodash");
const createHash = require("create-hash");

const prediction = {
  '0': 'Việt Nam thắng',
  '1': 'Hoà',
  '2': 'Việt Nam thua'
}

const hashToInt = hash => parseInt(hash.substr(-10), 16);
const randInt = (input = '') => {
  const hex = createHash("sha256")
    .update(input + block.hash, "utf8")
    .digest("hex");
  return hashToInt(hex);
};

const formatTime = ms => {
  const asiaTime = new Date(ms).toLocaleString("en-US", {
    timeZone: "Asia/Ho_Chi_Minh"
  });
  const d = new Date(asiaTime);
  return `${d.getDate()}/${d.getMonth() +
    1} ${d.getHours()}:${String(d.getMinutes()).padStart(2,"0")}:${String(d.getSeconds()).padStart(2, "0")}`;
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

const getTop = ({ result, winningNumber, icetea }, players, topCount = 10) => {
  players = Object.entries(players)
    .filter(([, p]) => (p.predict === result))
    .map(([address, p]) => ({
    address,
    ...p,
    delta: Math.abs(winningNumber - p.number)
  }));

  const winners = orderBy(players, ["delta", "timestamp"]).slice(0, topCount);
  const iceteaNum = Math.floor(icetea * winners.length)

  return [winners, iceteaNum]
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
    return `Dự đoán kết quả các trận đấu bóng đá Sea Games để nhận nhiều phần quà.</br>
        - 10 pack beer Người Yêu Cũ cho 10 người dự đoán đúng</br>
        - 1 Áo phông Icetea cho 01 người may mắn ngẫu nhiên trong 10 người trên
        `;
  }

  @pure getStateAccess() {
    return 'read'
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

  @transaction setResult(result: number) {
    this.expectAdmin()
    if (![0, 1, 2].includes(result)) {
      throw new Error('result must be 0, 1, or 2.')
    }

    this.result = {
      result: String(result),
      winningNumber: randInt(),
      icetea: Math.random()
    }
  }

  @transaction oncommand_mine() {
    const mine = this.players[msg.sender];
    if (!mine) {
      return Message.text("Bạn chưa dự đoán");
    }

    return Message.html(`Dự đoán: <b>${prediction[mine.predict]}</b><br>
            Thời điểm dự đoán: <b>${formatTime(mine.timestamp)}</b>
        `);
  }

  @view oncommand_result() {
    if (this.result == null) {
      return Message.text('Chưa có kết qủa.');
    }

    const [winners, icetea] = getTop(this.result, this.players, 10);

    const { result } = this.result
    let reply = `Kết quả: <b>${prediction[result]}</b><br>
            Số người tham dự: <b>${Object.keys(this.players).length}</b><br>
            Số người trúng giải: <b>${winners.length}</b><br><br>
            Sẽ nhận quà từ SkyGarden.`;
    winners.forEach(({ predict, name, maskPhone, timestamp }, index) => {
      reply += `<br>${index + 1}. ${name} - ${maskPhone} - ${formatTime(timestamp)}`;
    });

    reply += `<br><br> Người thứ ${icetea + 1} còn may mắn nhận thêm quà của Icetea!!`

    return Message.html(reply);
  }

  getSteps() {
    return [
      "intro", 'predict',
      {
        name: "phone",
        nextStateAccess: "write"
      },
      'name'
    ];
  }

  intro({ chatData }) {
    if (block.timestamp > deadline) {
      return Message.text('Dự đoán cho trận này đã đóng. Chờ trận tiếp theo.');
    }

    const m = Message
      .html('Trận Việt Nam - Lào')
      .buttonRow()
      .button('Việt Nam thắng', '0')
      .button('Hoà', '1')
      .button('Việt Nam thua', '2')
      .endRow()

    const old = this.players[msg.sender]

    if (old && old._) {
      // copy old data over
      chatData._ = old._
      chatData.hashPhone = old.hashPhone
      chatData.maskPhone = old.maskPhone
      chatData.name = old.name
      chatData._step += 2 // skip next 2 steps
      m.nextStateAccess('write')
    }
    
    return m
  }

  after_predict() {
    return Message.html('Số di động (để liên lạc khi trúng giải)')
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

  after_phone() {
    return Message.html(
      "Tên bạn là gì?"
    ).input("Anh Loành")
    .requestEncryption(this.publicKey, ['phone'])
  }

  validate_name({ text, chatData }) {
    if (chatData.name) return chatData.name

    const name = text.normalize().trim()
    if (!name) {
      throw new Error('Bạn cần điền tên để tiện liên lạc khi trúng giải.')
    }

    return ( chatData.name = name.split(' ').map(w => w[0].toUpperCase() + w.substr(1).toLowerCase()).join(' ') )
  }

  retry_name({ error }) {
    return Message.text(error.message)
      .input("Chị Linh")
      .nextStateAccess("write");
  }

  after_name( {text, chatData} ) {
    if (block.timestamp > deadline) {
      return Message.text('Chán quá, đã quá giờ dự đoán. Chờ kết quả');
    }

    // save state
    const chat = { ...chatData }
    delete chat._step
    if (!chat.predict) chat.predict = text
    chat.timestamp = block.timestamp
    chat.number = randInt(chat._)
    this.players[msg.sender] = chat

    // reply
    return Message.html(`Xong rồi. Cảm ơn bạn. Trận đấu diễn ra vào ${deadlineText}.`)
  }
}
