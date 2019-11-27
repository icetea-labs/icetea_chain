const { SurveyBot, Message } = require("@iceteachain/utils");
const { orderBy } = require("lodash");
const createHash = require("create-hash");


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
    throw new Error('Số điện thoại sai sai. Bạn nhập đủ 10 số viết liền theo định dạng 03x, 05x, 07x, 08x hoặc 09x mới ok.')
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

const link = domain => `<a href='https://${domain}' target='_blank'>${domain}</a>`
const linkSky = link('skygarden.vn')
const linkIcetea = link('icetea.io')
const linkTelegram = link('t.me/iceteachainvn')

const concatPath = (p1, p2) => {
  if (!Array.isArray(p1)) p1 = [p1]
  if (!Array.isArray(p2)) p2 = [p2]
  return p1.concat(p2)
}

const spaceRenter = loadContract('contract.spacerenter')

const path = (basePath, baseDefVal) => {
  return {
    has(path) {
      return spaceRenter.getGlobalState.invokeView(concatPath(basePath, path)) != null
    },
    value() {
      return spaceRenter.getGlobalState.invokeView(basePath, baseDefVal)
    },
    get(path, defVal) {
      return spaceRenter.getGlobalState.invokeView(concatPath(basePath, path), defVal)
    },
    set(path, value) {
      return spaceRenter.setGlobalState.invokeUpdate(concatPath(basePath, path), value)
    }
  }
}

@contract
class LuckyBot extends SurveyBot {

  data = path('data', {});
  users = path('users', {})

  @state @view admins
  @state @view matchId = 'vie_lao'

  @state @view name = 'DỰ ĐOÁN SEAGAMES CÙNG SKYGARDEN BOT'
  @state @view description = `Tặng: 1 lon
  <a href='https://www.facebook.com/SkyGarden/photos/a.1389606451261750/2261853797370340/?type=3&theater' target='_blank'>beer Người Yêu Cũ</a>
  cho TẤT CẢ người đoán đúng.
  Nhận tại các nhà hàng thuộc ${linkSky} ở TP HCM.<br>
  Trận: Việt Nam - Lào (16:00 ngày 28/11)
  `
  @state @view startButtonText = "Bắt đầu"

  @state @view how = `- Giải của SkyGarden: bạn đến 1 trong các nhà hàng và trình kết quả bot hiển thị.
  Thắc mắc xin liên lạc ${linkSky}<br>
  - Giải của Icetea (nếu có): chúng tôi sẽ liên lạc theo số điện thoại đăng kí.
  Có vấn đề xin liên lạc Telegram ${linkTelegram} hoặc website ${linkIcetea}.
  `

  @state @view publicKey = 'cStHMto8vNjeoySikZkS2dUAWjpqZkGQezvVh2mys7t5'

  constructor() {
    this.admins = [this.deployedBy]
  }

  @view botInfo() {
    const oldPredict = this.getPlayer(msg.sender).predict != null

    return {
      name: this.name,
      description: this.description,
      stateAccess: 'read',
      startButtonText: !oldPredict ? this.startButtonText : "Chơi lại",
      showMenuButton: oldPredict,
      commands: [
        { text: "Chơi lại", value: "start" },
        { text: "Kết quả", value: "result", stateAccess: "read" },
        { text: "Cách nhận giải", value: "how", stateAccess: "read" },
        { text: "Tài khoản", value: "account", stateAccess: "read" },
        { text: "About this bot", value: "about", stateAccess: "read" }
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

  @transaction setPubKey(pubkey: address) {
    this.expectAdmin()
    this.publicKey = pubkey
  }

  @transaction setHow(how: address) {
    this.expectAdmin()
    this.how = how
  }

  @view getMatchProp(prop: string, matchId: ?string) {
    return this.data.get([matchId || this.matchId, 'info', prop])
  }

  @transaction setMatchProp(prop: string, value, matchId: ?string) {
    this.expectAdmin()
    return this.data.set([matchId || this.matchId, 'info', prop], value)
  }

  @view hasIceteaPrize(matchId: ?string) {
    return this.data.get([matchId || this.matchId, 'info', 'icetea'], false)
  }

  @transaction setIceteaPrize(value: boolean, award: ?string, matchId: ?string) {
    this.expectAdmin()
    this.data.set([matchId || this.matchId, 'info', 'icetea'], value)
    if (award) {
      this.data.set([matchId || this.matchId, 'info', 'iceteaAward'], award)
    }
  }

  @transaction setMatchId(matchId: string,) {
    this.expectAdmin()
    // check if match Id exist
    if (!this.data.has(matchId)) {
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
    return this.users.get(addr, {})
  }

  setUser(info) {
    return this.users.set(msg.sender, info)
  }

  @transaction setResult(result: number, matchId: ?string) {
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

    this.setMatchInfo(matchId || this.matchId, info)
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
                reply += `<br>- Từ ${link}: ${info.award || 'có'}`
              }
              if (isIcetea) {
                reply += `<br>- Từ ${linkIcetea}: ${info.iceteaAward || 'có'}`
              }
            } else {
              reply += '<br>- không có (bạn chưa may mắn)'
            }
            
          } else {
            reply += `Đáp án đúng: ${this.getPrediction(info.result)}. Bạn đoán sai.`
          }
        }
      }
    })

    return reply || 'Bạn chưa tham gia'
  }

  @view oncommand_how() {
    return Message.html(this.how)
  }

  @view oncommand_result() {
    return Message.html(this.viewResult(msg.sender))
  }

  sayAbout(m) {
    m = m || Message.create()
    return m.html(`Bot này chạy trên <b>Icetea Platform</b>. Liên lạc ${linkIcetea} hoặc đặt câu hỏi Telegram ${linkTelegram}.`)
      .html('<a href="https://icetea.io" target="_blank"><img src="https://icetea.io/wp-content/uploads/2019/07/Logo-Blue-185x50.png"></a>')
  }

  @view oncommand_about() {
    return this.sayAbout()
  }

  @view oncommand_account() {
    const user = this.getUser(msg.sender)
    let reply = `ID: ${msg.sender}<br>`
    if (!user || !user.name) {
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
      return Message.text('Dự đoán cho trận này đã đóng. Chờ trận tiếp theo.')
        .button('Xem kết quả', 'command:result')
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
    return Message.html('Nhập số di động (để liên lạc khi trúng giải)')
      .input('0xx', {sub_type: 'tel'})
  }

  validate_phone({ text, chatData }) {
    const phone = validatePhoneNumber(text)
    const hash = hashPhone(phone)

    const phoneInUseByOther =
      Object.entries(this.users.value()).find(
        ([a, u]) => (a !== msg.sender && u.hashPhone === hash)
      )

    if (phoneInUseByOther) {
      const name = phoneInUseByOther[1].name
      throw new Error(
        `Đã có người dùng khác (${name}) đăng kí số điện thoại này. Bạn hãy dùng số khác. Nếu chính là bạn và muốn dự đoán lại, hãy vào bằng trình duyệt lần trước.`
      );
    }

    chatData.phone = phone
    chatData.maskPhone = maskPhone(phone)
    chatData.hashPhone = hash

    return phone
  }

  retry_phone({ error }) {
    return Message.text(error.message)
      .input('0xx', {sub_type: 'tel'})
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
      return Message.text('Chán quá, đã quá giờ dự đoán. Chờ trận tiếp.');
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
    const m = Message.html(`Xong rồi, cảm ơn bạn. Trận đấu sẽ diễn ra vào ${formatTime(info.deadline)}.`)
      .html('Để xem kết quả, cách thức nhận thưởng, vui lòng vào <b>MENU</b> ở góc trên bên phải màn hình.')
      
    return this.sayAbout(m)
  }
}
