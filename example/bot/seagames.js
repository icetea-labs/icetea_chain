const { SurveyBot, Message } = require("@iceteachain/utils");
const { stateUtil } = require(';')
const { orderBy } = require("lodash");
const createHash = require("create-hash");

const { path } = stateUtil(this)

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

  data = path('data', {});
  users = path('users', {})

  @state @view spaceRenter = 'contract.spacerenter'

  @state @view winningNumber;
  @state @view result
  @state @view admins
  @state @view matchId = 'vie_lao'

  @state @view name = 'DỰ ĐOÁN SEAGAMES CÙNG SKYGARDEN BOT'
  @state @view description = `Tặng: 1 lon beer Người Yêu Cũ cho TẤT CẢ người đoàn đúng<br>
  Trận: Việt Nam - Lào (16:00 ngày 28/11)
  `
  @state @view startButtonText = "Bắt đầu"

  @state @view publicKey = 'cStHMto8vNjeoySikZkS2dUAWjpqZkGQezvVh2mys7t5'

  constructor() {
    this.admins = [this.deployedBy]
  }

  @view botInfo() {
    const oldPredict = this.getPlayer(msg.sender).predict
    return {
      name: this.name,
      description: this.description,
      stateAccess: 'read',
      startButtonText: oldPredict == null ? this.startButtonText : "Chơi lại",
      commands: [
        { text: "Chơi lại", value: "start" },
        { text: "Kết quả", value: "result", stateAccess: "read" },
        { text: "Tài khoản", value: "account", stateAccess: "read" }
      ]
    }
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

  @transaction setBotInfo(name: ?string, desc: ?string, startText: ?string) {
    this.expectAdmin()
    (name != null) && (this.name = name)
    (desc != null) && (this.description = desc)
    (startText != null) && (this.startButtonText = startText)
  }

  @transaction setSpaceRenter(addr: address) {
    this.expectAdmin()
    this.spaceRenter = addr
  }

  @view hasIceteaPrize(matchId: ?string) {
    this.data.get([matchId || this.matchId, 'info', 'icetea'], false)
  }

  @transaction setIceteaPrize(value: boolean, award: ?string) {
    this.expectAdmin()
    this.data.set([matchId || this.matchId, 'info', 'icetea'], value)
    if (award) {
      this.data.set([matchId || this.matchId, 'info', 'iceteaAward'], award)
    }
  }

  @transaction setMatchId(matchId: string,) {
    this.expectAdmin()
    // check if match Id exist
    if (!this.data[matchId]) {
      throw new Error('Match not exist.')
    }
    this.matchId = matchId
  }

  @transaction setMatchInfo(matchId: string, info) {
    this.expectAdmin()
    this.data.set([matchId || this.matchId, 'info'], info)
  }

  @view getMatchInfo(matchId: ?string) {
    return this.data.get([matchId || this.matchId, 'info'], {})
  }

  getPrediction(p) {
    p = +p
    const answers = this.getMatchInfo().answers
    return answers[p]
  }

  @view getPlayers(matchId: ?string) {
    return this.data.get([matchId || this.matchId, 'players'], {})
  }

  @view getPlayer(addr: address, matchId: ?string) {
    return this.data.get([matchId || this.matchId, 'players', addr], {})
  }

  setPlayer(value) {
    return this.data.set([this.matchId, 'players', msg.sender], value)
  }

  getUser(addr) {
    if (!this.spaceRenter) {
      throw new Error('No spacerenter.')
    }
    const d = loadContract(this.spaceRenter)
    return d.getGlobalState.invokeView(['users', addr], {})
  }

  setUser(info) {
    if (!this.spaceRenter) {
      throw new Error('No spacerenter.')
    }
    const d = loadContract(this.spaceRenter)
    return d.setGlobalState.invokeUpdate(['users', msg.sender], info)
  }

  @transaction setResult(result: number) {
    this.expectAdmin()
    const info = this.getMatchInfo()

    if (info.answers[result] == null) {
      throw new Error('Invalid result.')
    }

    // allow reset in case of mistake
    info.result = result

    if (info.rand == null) {
      info.rand = Math.random()
    }

    this.setMatchInfo(this.matchId, info)
  }

  isTopWinning(info, players) {
    let top = Number(info.top)
    const rand = info.rand
    if (!top && !info.icetea) return [true, false]

    players = Object.entries(players)
      .filter(([, p]) => (+p.predict === +info.result))

    const count = players.length
    const winningNumber = Math.floor(rand * count)

    players = players.map(([address, p], index) => ({
      address,
      ...p,
      delta: Math.abs(winningNumber - index)
    }));

    let winners = orderBy(players, ["delta", "timestamp"])
    if (top && top > winners.length) {
      winners = winners.slice(0, top)
    }
    
    const isTop = !top || (top <= count) || winners.find(w => w.address = msg.sender) != null
    const isIcetea = info.icetea && winners[winningNumber].address === msg.sender

    return [isTop, isIcetea]
  }

  @view viewResult(who: address) {
    let reply = ''
    const data = this.data.value()
    if (!data) return 'Chưa có kết quả'
    Object.entries(data).forEach(([, {info = {}, players = {}}]) => {
      const me = players[who]
      if (me && (me.predict != null)) {
        if (reply) reply += '<br><br>'
        reply += `<b>Trận ${info.host} - ${info.visitor}</b><br>
        Câu hỏi: ${info.question}<br>
        Bạn trả lời: ${this.getPrediction(me.predict)}<br>
        `
        if (info.result == null) {
          reply += 'Kết quả: chưa có'
        } else {
          let win = false
          if (+me.predict === +info.result) {
            reply += 'Bạn đoán đúng.'
            const [isTop, isIcetea] = this.isTopWinning(info, players)
            if (isTop || isIcetea) {
              reply += '<br>Phần thưởng:'
              if (isTop) {
                reply += `<br>- Từ skygarden.vn: ${info.award || 'có'}`
              }
              if (isIcetea) {
                reply += `<br>- Từ icetea.io: ${info.iceteaAward || 'có'}`
              }
            } else {
              reply += '<br>- không có (bạn chưa may mắn)'
            }
            
          } else {
            reply += 'Bạn đoán sai.'
          }
        }
      }
    })

    return reply || 'Chưa có kết quả'
  }

  @view oncommand_result() {
    return Message.html(this.viewResult(msg.sender))
  }

  @view oncommand_account() {
    const user = this.getUser(msg.sender)
    let reply = `ID: ${msg.sender}<br>`
    if (!user) {
      reply += `Tình trạng: chưa đăng kí`
    } else {
      reply += `Tên: ${user.name}<br>
      Điện thoại: ${user.maskPhone}`
    }
    
    return Message.html(reply)
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
    const info = this.getMatchInfo()

    if (block.timestamp > info.deadline) {
      return Message.text('Dự đoán cho trận này đã đóng. Chờ trận tiếp theo.');
    }

    let m = Message
      .html(`Trận ${info.host} - ${info.visitor}`)
      .html(info.question)
      .buttonRow()

    const ans = info.answers
    for (let i = 0; i < ans.length; i++) {
        m.button(ans[i], String(i))
    }

    m = m.endRow()

    const old = this.getUser(msg.sender)

    if (old && old._) {
      // copy old data over
      chatData.oldUser = true
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
      Object.entries(this.getPlayers()).find(
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
    const info = this.getMatchInfo()

    if (block.timestamp > info.deadline) {
      return Message.text('Chán quá, đã quá giờ dự đoán. Chờ kết quả');
    }

    if (chatData.predict == null) {
      chatData.predict = text
    }

    // save state
    const chat = {
      predict: chatData.predict,
      timestamp: block.timestamp
    }

    this.setPlayer(chat)
    if (!chatData.oldUser) {
      const user = {
        name: chatData.name,
        maskPhone: chatData.maskPhone,
        hashPhone: chatData.hashPhone,
        _: chatData._
      }

      this.setUser(user)
    }

    // reply
    return Message.html(`Xong rồi, cảm ơn bạn. Trận đấu sẽ diễn ra vào ${formatTime(info.deadline)}.`)
      .html('Để xem kết quả, cách thức nhận thưởng, vui lòng vào <b>MENU</b> ở góc trên bên phải màn hình.')
  }
}
