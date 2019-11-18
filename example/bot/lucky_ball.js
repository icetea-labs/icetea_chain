const { SurveyBot, Message } = require("@iceteachain/utils");
const { orderBy } = require("lodash");

const formatTime = ms => {
  const asiaTime = new Date(ms).toLocaleString("en-US", {
    timeZone: "Asia/Ho_Chi_Minh"
  });
  const d = new Date(asiaTime);
  return `${d.getDate()}/${d.getMonth() +
    1}/${d.getFullYear()} ${d.getHours()}:${String(d.getMinutes()).padEnd(
    2,
    "0"
  )}:${String(d.getSeconds()).padEnd(2, "0")} GMT+7`;
};

const deadline = 1574168340000;
const deadlineText = formatTime(deadline);
const RESULT = {
  1: "Việt Nam",
  2: "Hai Đội Hoà",
  3: "Thái Lan"
};
const ADMIN = ["teat0xdehhhgghkvc5l8r68vd3w7xssskwx9tl8ucxh"];
const getTop20 = (winningTeam, winningNumber, players) => {
  let winners = {};
  let loses = {};

  Object.keys(players).forEach(key => {
    if (players[key].team === winningTeam) {
      winners[key] = players[key];
    } else {
      loses[key] = players[key];
    }
  });

  winners = Object.entries(winners).map(([address, p]) => ({
    address,
    ...p,
    delta: Math.abs(winningNumber - p.number)
  }));
  return {
    winners: orderBy(winners, ["delta", "timestamp"]).slice(0, 20),
    loses: orderBy(loses, ["timestamp"]).slice(0, 100)
  };
};

@contract
class LuckyBallBot extends SurveyBot {
  @state @view players = {};
  @state @view winningTeam;
  @state @view winningNumber;

  @pure getName() {
    return `DỰ ĐOÁN KẾT QUẢ VÒNG LOẠI WORLD CUP 2022`;
  }

  @pure getDescription() {
    return `Trận Việt Nam gặp Thái Lan - 20h00, thứ Ba, 19/11/2019<br/>
    - 01 giải Nhất gồm 01 combo áo phông - xà bông Icetea + 500k token Linkhay<br/>
    - 01 giải Nhì gồm 01 combo áo phông - xà bông Icetea + 300k token Linkhay<br/>
    - 10 giải "Khúc khích", mỗi giải 100k token Linkhay<br/>
    `;
  }

  @pure getCommands() {
    return [
      { text: "Restart", value: "start" },
      { text: "My Kèo", value: "mynumber", stateAccess: "write" },
      { text: "View Result", value: "result", stateAccess: "write" }
    ];
  }

  @transaction oncommand_mynumber() {
    const mynumber = this.players[msg.sender];
    if (!mynumber) {
      return Message.text("You did not participate yet.");
    }

    return Message.html(`Telegram: <b>@${mynumber.telegram}</b><br>
            Dự đoán: <b>${mynumber.team}</b></br>
            Tổng bàn thắng: <b>${mynumber.number}</b></br>
            At: <b>${formatTime(mynumber.timestamp)}</b>
        `);
  }

  @transaction oncommand_setResult(chu, khach) {
    if (ADMIN.indexOf(msg.sender) === -1) {
      throw new Error("Require admin!");
    }
    let team = 1;
    chu = parseInt(chu, 10);
    khach = parseInt(khach, 10);
    // if (block.timestamp < deadline) {
    //   throw new Error(`Please wait until ${deadlineText}`);
    // }
    if (chu > khach) {
      team = 1;
    } else if (chu < khach) {
      team = 3;
    } else {
      team = 2;
    }

    this.winningTeam = RESULT[team];
    this.winningNumber = parseInt(chu + khach, 10);
    return { team: RESULT[team], number: chu + khach };
  }

  @transaction oncommand_result() {
    // if (block.timestamp < deadline) {
    //   return Message.text(`Please wait until ${deadlineText}`);
    // }
    if (this.winningTeam == null || this.winningNumber == null) {
      return Message.text(`Chưa có kết quả, xin hãy đợi chút!`);
    }

    const { winners, loses } = getTop20(
      this.winningTeam,
      this.winningNumber,
      this.players
    );
    let reply = `Đội chiến thắng: <b>${this.winningTeam}</b> 
            -- Tổng bàn thắng 2 đội: <b>${this.winningNumber}</b><br>
            Tổng số người chơi: <b>${Object.keys(this.players).length}</b>`;
    reply += "<table style='font-size: 14px' >";
    reply += "<tr>";
    reply += "<th>Telegram</th>";
    reply += "<th>Dự đoán</th>";
    reply += "<th>Bàn Thắng</th>";
    reply += "<th>Time</th>";
    reply += "</tr>";
    winners.forEach(({ team, number, telegram, timestamp, delta }, index) => {
      reply += "<tr>";
      reply += `<td>${index +
        1}. <a href='https://t.me/{telegram}' target='_blank'>@${telegram}</a></td>`;
      reply += `<td>${team}</td>`;
      reply += `<td>${number} (±${delta})</td>`;
      reply += `<td>${formatTime(timestamp).replace("GMT+7", "")}</td>`;
      reply += "</tr>";
    });
    reply += "</table>";

    reply += "<br>--- Nhóm dự đoán sai ---";
    reply += "<table style='font-size: 14px' >";
    reply += "<tr>";
    reply += "<th>Telegram</th>";
    reply += "<th>Dự đoán</th>";
    reply += "<th>Bàn Thắng</th>";
    reply += "<th>Time</th>";
    reply += "</tr>";
    loses.forEach(({ team, number, telegram, timestamp }, index) => {
      reply += "<tr>";
      reply += `<td>${index +
        1}. <a href='https://t.me/{telegram}' target='_blank'>@${telegram}</a></td>`;
      reply += `<td>${team}</td>`;
      reply += `<td>${number}</td>`;
      reply += `<td>${formatTime(timestamp).replace("GMT+7", "")}</td>`;
      reply += "</tr>";
    });
    reply += "</table>";
    return Message.html(reply);
  }

  getSteps() {
    return [
      "intro",
      {
        name: "team",
        nextStateAccess: "read"
      },
      {
        name: "number",
        nextStateAccess: "write"
      },
      {
        name: "telegram",
        nextStateAccess: "write"
      }
    ];
  }

  intro() {
    if (block.timestamp > deadline) {
      return Message.text("This lucky draw is already closed.");
    }

    const m = Message.html(
      `<b>NOTE</b><br/> Chỉ dành riêng cho các thành viên của group Icetea VietNam trên Telegram. Hãy tham gia tại <a href="https://t.me/iceteachainvn" target="_blank">@iceteachainvn</a> trước khi bắt đầu chơi nhé!`
    )
      .html("B1: Đội thắng:")
      .buttonRow();
    m.button(RESULT[1]);
    m.button(RESULT[2]);
    m.button(RESULT[3]);
    return m.endRow();
  }

  validate_team({ text, chatData }) {
    if (text.trim() === RESULT[3]) {
      throw new Error(
        "Rất tiếc, phương án bạn chọn quá viễn vông. Vui lòng chọn lại."
      );
    }
    return (chatData.team = text);
  }
  retry_team({ error }) {
    const m = Message.text(error.message).buttonRow();
    m.button(RESULT[1]);
    m.button(RESULT[2]);
    m.button(RESULT[3]);
    return m.endRow();
  }
  after_team() {
    if (block.timestamp > deadline) {
      return Message.text("This lucky draw is already closed.");
    }
    return Message.html("B2: Tổng số bàn thắng của 2 đội:").input("number");
  }
  validate_number({ text, chatData }) {
    const value = text.trim();
    const reg = /^\d+$/;
    if (!reg.test(value)) {
      throw new Error("Không hợp lệ, vui lòng không troll!");
    }
    return (chatData.number = text);
  }
  retry_number({ error }) {
    return Message.text(error.message).input("number");
  }
  after_number() {
    if (block.timestamp > deadline) {
      return Message.text("This lucky draw is already closed.");
    }
    return Message.html(
      "B3: Nhập chính xác tài khoản Telegram của bạn.<br/>(<b>@username</b> hoặc <b>username</b>)"
    ).input("@username");
  }

  validate_telegram({ text, chatData }) {
    let value = text.trim().toLowerCase();
    if (value.startsWith("@")) {
      value = value.slice(1);
    }
    if (!value) {
      throw new Error(
        "Please input your telegram username. If you don't have one, please register."
      );
    }

    const [oldAddress, oldPlayer] =
      Object.entries(this.players).find(
        ([address, p]) => p.telegram === value
      ) || [];

    if (oldAddress) {
      if (oldAddress !== msg.sender) {
        throw new Error(
          `Another user has claim to be @${value} and he/she picked number ${oldPlayer.number}. Please enter a different telegram username.`
        );
      } else {
        chatData.oldTeam = oldPlayer.team;
        chatData.oldNumber = oldPlayer.number;
      }
    }

    return (chatData.telegram = value);
  }

  retry_telegram({ error }) {
    return Message.text(error.message)
      .input("@username")
      .nextStateAccess("write");
  }

  after_telegram({ chatData }) {
    if (block.timestamp > deadline) {
      return Message.text("This lucky draw is already closed.");
    }
    const { team, number, telegram, oldTeam, oldNumber } = chatData;
    let reply = `Bạn đã dự đoán : <b>${team}</b> 
             <br>Tổng bàn thắng 2 đội là: <b>${number}</b> 
             <br>Tài khoản Telegram của bạn: <b>@${telegram}</b>
             <br><b>Hãy cổ vũ đội tuyển Việt Nam hết mình và chờ đón kết quả ngay sau khi trận đấu kết thúc nhé!</b>`;
    if (oldTeam || oldNumber) {
      reply += `<br><br><b>NOTE (Dự đoán cũ)</b>
                    <br>Kết quả trận đấu : <b>${oldTeam}</b>
                    <br>Tổng số bàn thắng:  <b>${oldNumber}</b>
                    <br><b>Đã được update!</b>`;
    }
    this.players[msg.sender] = {
      team,
      number,
      telegram,
      timestamp: block.timestamp
    };
    return Message.html(reply);
  }
}
