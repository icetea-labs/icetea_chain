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

const link = (domain, text) => `<a href='https://${domain}' target='_blank'>${text || domain}</a>`
const linkSky = link('skygarden.vn')
const linkIcetea = link('icetea.io')
const linkPlatform = link('icetea.io', 'Icetea Platform')
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

  settings = path('settings', {})
  data = path('data', {});
  users = path('users', {})

  @state @view admins

  @state @view name = 'DỰ ĐOÁN SEAGAMES CÙNG SKYGARDEN BOT'
  @state @view description = `Giải thưởng:<br>
  - 10 voucher 500k cho 10 bạn đoán đúng may mắn nhất<br>
  - 1 lon <a href='https://www.facebook.com/SkyGarden/photos/a.1389606451261750/2261853797370340/?type=3&theater' target='_blank'>beer Người Yêu Cũ</a>
  cho TẤT CẢ người đoán đúng.<br>
  Nhận tại các nhà hàng thuộc ${linkSky} ở TP HCM.`

  @state @view startButtonText = "Bắt đầu"

  @state @view how = `Đến 1 nhà hàng bất kỳ thuộc hệ thống SkyGarden và trình số điện thoại <em>hoặc</em> kết quả hiển thị trên bot.<br><br>
  Các giải thưởng may mắn được lựa chọn ngẫu nhiên bởi hợp đồng thông minh chạy trên ${linkPlatform}<br><br>
  Có vấn đề xin liên lạc ${linkSky} hoặc chat Telegram tại ${linkTelegram}.`

  @state @view privacy = `Số điện thoại được mã hoá hoàn toàn ở mức bảo mật cao nhất. SkyGarden không chia sẻ số điện thoại với bên thứ 3. Hệ thống phần mềm sẽ tự động nhắn tin cho những người trúng giải.`

  @state @view publicKey = 'cStHMto8vNjeoySikZkS2dUAWjpqZkGQezvVh2mys7t5'

  constructor() {
    this.admins = [this.deployedBy, 'teat0cwf3pzzjuwdtryq2f45srezwfh90uswd4939nq']
  }

  @view botInfo() {
    const player = this.getPlayer(msg.sender)
    const oldPredict = player.predict != null
    const info = this.getMatchInfo()
    const desc = this.description + `<br><br><b>Trận ${info.host} - ${info.visitor}</b> (${formatTime(info.deadline)})`
    const user = this.getUser(msg.sender)

    return {
      name: this.name,
      description: desc,
      stateAccess: 'read',
      startButtonText: !oldPredict ? this.startButtonText : "Chơi lại",
      showMenuButton: oldPredict,
      match: info,
      player,
      user: user.name ? { name: user.name } : undefined,
      commands: [
        { text: "Chơi lại", value: "start" },
        { text: "Kết quả", value: "result", stateAccess: "read" },
        { text: "Cách nhận giải", value: "how", stateAccess: "read" },
        { text: "Tài khoản", value: "account", stateAccess: "read" },
        { text: "Quyền riêng tư", value: "privacy", stateAccess: "read" },
        { text: "Nhà phát triển", value: "about", stateAccess: "read" }
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
    if (name != null) {
      this.name = name
    }
    if (desc != null) {
      this.description = desc
    }
    if (startText != null) {
      this.startButtonText = startText
    }
  }

  @transaction setPubKey(pubkey: string) {
    this.expectAdmin()
    this.publicKey = pubkey
  }

  @transaction setHow(how: string) {
    this.expectAdmin()
    this.how = how
  }

  @transaction setPrivacy(privacy: string) {
    this.expectAdmin()
    this.privacy = privacy
  }

  @view getMatchProp(prop: string, matchId: ?string) {
    return this.data.get([matchId || this.getMatchId(), 'info', prop])
  }

  @transaction setMatchProp(prop: string, value, matchId: ?string) {
    this.expectAdmin()
    return this.data.set([matchId || this.getMatchId(), 'info', prop], value)
  }

  @view getMatchId() {
    return this.settings.get('matchId', 'vie_ind')
  }

  @transaction setMatchId(matchId: string,) {
    this.expectAdmin()
    // check if match Id exist
    if (!this.data.has(matchId)) {
      throw new Error('Match not exist.')
    }

    this.settings.set('matchId', matchId)
  }

  @transaction setMatchInfo(matchId: ?string, info) {
    this.expectAdmin()
    this.data.set([matchId || this.getMatchId(), 'info'], info)
  }

  @view getMatchInfo(matchId: ?string) {
    return this.data.get([matchId || this.getMatchId(), 'info'], {})
  }

  getPrediction(p, matchId) {
    p = +p
    const answers = this.getMatchInfo(matchId).answers
    return answers[p]
  }

  @view getPlayers(matchId: ?string) {
    return this.data.get([matchId || this.getMatchId(), 'players'], {})
  }

  @view getPlayer(addr: address, matchId: ?string) {
    return this.data.get([matchId || this.getMatchId(), 'players', addr], {})
  }

  setPlayer(value) {
    return this.data.set([this.getMatchId(), 'players', msg.sender], value)
  }

  getUser(addr) {
    return this.users.get(addr, {})
  }

  setUser(info) {
    return this.users.set(msg.sender, info)
  }

  @transaction setResult(result: number, matchId: ?string) {
    this.expectAdmin()
    const info = this.getMatchInfo(matchId)

    if (info.answers[result] == null) {
      throw new Error('Invalid result.')
    }

    // allow reset in case of mistake
    info.result = result

    if (info.rand == null) {
      info.rand = Math.random()
    }

    matchId = matchId || this.getMatchId()
    this.setMatchInfo(matchId, info)

    this.emitEvent('ResultSet', { matchId, result }, ['matchId'])
  }

  filterPlayers(info, players) {
    players = Object.entries(players)
      .filter(([, p]) => (+p.predict === +info.result))

    const count = players.length
    const winningNumber = Math.floor(info.rand * count)

    players = players.map(([address, p], index) => ({
      address,
      ...p,
      delta: Math.abs(winningNumber - index)
    }));

    players = orderBy(players, ["delta", "timestamp"])

    return [players, winningNumber]
  }

  isTopWinning(info, players) {
    const top = Number(info.top)
    if (!top && !info.iceteaAward) return [false, false]

    const [orderedPlayers, winningNumber] = this.filterPlayers(info, players)
    const count = orderedPlayers.length

    let winners = orderedPlayers
    if (top && top < count) {
      winners = winners.slice(0, top)
    }
    
    const isTop = top && (top >= count || winners.find(w => w.address === msg.sender) != null)
    const isIcetea = info.iceteaAward && orderedPlayers[winningNumber].address === msg.sender

    return [isTop, isIcetea]
  }

  @transaction getWinners(matchId: ?string) {
    this.expectAdmin()

    const info = this.getMatchInfo(matchId)
    const players = this.getPlayers(matchId)

    const [orderedPlayers, ] = this.filterPlayers(info, players)
    if (orderedPlayers) {
      const top = +info.top
      orderedPlayers.forEach((p, i) => {
        p.top = !!(top && (i < top))
      })

      return orderedPlayers
    } else {
      return []
    }
  }

  @view viewResult(who: address) {
    let reply = ''
    const data = this.data.value()
    if (!data) return 'Chưa có kết quả'
    Object.entries(data).reverse().forEach(([matchId, {info = {}, players = {}}]) => {
      const me = players[who]
      if (me && (me.predict != null)) {
        if (reply) reply += '<br><br>'
        reply += `<b>Trận ${info.host} - ${info.visitor}</b><br>
        Câu hỏi: ${info.question}<br>
        Bạn trả lời: ${this.getPrediction(me.predict, matchId)}<br>
        `
        if (info.result == null) {
          reply += 'Kết quả: chưa có'
        } else {
          if (+me.predict === +info.result) {
            reply += 'Bạn đoán đúng.'
            const [isTop, isIcetea] = this.isTopWinning(info, players)
            if (info.award || isTop || isIcetea) {
              reply += '<br>Phần thưởng:'
              if (info.award) {
                reply += `<br>- Từ ${linkSky}: ${info.award}`
              }
              if (isTop) {
                reply += `<br>- Từ ${linkSky}: ${info.topAward || 'voucher'}`
              }
              if (isIcetea) {
                reply += `<br>- Từ ${linkIcetea}: ${info.iceteaAward || 'có'}`
              }
            } else {
              reply += '<br>- không có (bạn chưa may mắn)'
            }
            
          } else {
            reply += `Đáp án đúng: ${this.getPrediction(info.result, matchId)}. Bạn đoán sai.`
          }
        }
      }
    })

    return reply || 'Bạn chưa tham gia'
  }

  @view oncommand_how() {
    return Message.html(this.how)
  }

  @view oncommand_privacy() {
    return Message.html(this.privacy)
  }

  @view oncommand_result() {
    return Message.html(this.viewResult(msg.sender))
  }

  sayAbout(m) {
    m = m || Message.create()
    return m.html(`Bot game chạy trên <b>Icetea Platform</b>. Truy cập ${linkIcetea} hoặc tham gia Telegram group ${linkTelegram} để tìm hiểu thêm.`)
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
