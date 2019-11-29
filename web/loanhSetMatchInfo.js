import tweb3 from "./tweb3";
// import { ecc, codec } from '@iceteachain/common'
import { decrypt } from "eciesjs";
import $ from "jquery";
window.$ = $;

$(document).ready(function() {
  document.getElementById("datePicker").valueAsDate = new Date();
  document.getElementById("timePicker").defaultValue = "20:00";
  const key = localStorage.getItem("bot_token");
  console.log(key);
  if (key) byId("key").value = JSON.parse(key).key;
  setPreview();
});

function byId(id) {
  return document.getElementById(id);
}

function doDecrypt(privateKey, cipherText) {
  const plainText = decrypt(
    privateKey.toString("hex"),
    Buffer.from(cipherText, "base64")
  ).toString();
  try {
    return JSON.parse(plainText);
  } catch (e) {
    console.warn(e);
    return plainText;
  }
}

function getField(id) {
  const f = byId(id);
  const v = f.value.trim();
  if (!v) {
    f.focus();
    throw new Error("Please input " + id);
  }

  return v;
}

function checkKey() {
  return tweb3.wallet.importAccount(getField("key"));
}

function getAllField() {
  const info = {};
  info.host = getField("host");
  info.visitor = getField("visitor");
  info.top = getField("top");
  info.topAward = getField("topAward");
  info.award = getField("award");
  info.question = getField("question");
  info.answers = [
    getField("answers1"),
    getField("answers2"),
    getField("answers3")
  ];
  const date = getField("datePicker");
  const time = getField("timePicker");
  info.deadline = Date.parse(date + " " + time + " GMT+7");
  info.icetea = false;
  return info;
}
byId("savekey").addEventListener("click", function(e) {
  const key = getField("key");
  if (key) {
    localStorage.setItem("bot_token", JSON.stringify({ key }));
    window.alert("save done");
  }
});
byId("clearkey").addEventListener("click", function(e) {
  byId("key").value = "";
  localStorage.setItem("bot_token", JSON.stringify({ key: "" }));
  window.alert("clear done");
});
byId("showkey").addEventListener("click", function(e) {
  byId("key").type = "text";
});

byId("setMatchInfo").addEventListener("submit", function(e) {
  e.preventDefault();
  let account;
  try {
    account = checkKey();
  } catch (e) {
    window.alert(e.message);
    return;
  }

  let info = getAllField();
  const matchId = "vie_lao";
  tweb3
    .contract("contract.seagames")
    .methods.setMatchInfo(matchId, info)
    .sendCommit()
    .then(r => {
      console.log(r);
      window.alert(e.message);
    })
    .catch(e => {
      console.error(e);
      window.alert(e.message);
    });
  const desc = getDescription(info);
  const botname = getField("botname");

  tweb3
    .contract("contract.seagames")
    .methods.setBotInfo(botname, desc, "Chơi lại")
    .sendCommit()
    .then(r => {
      console.log(r);
      window.alert(e.message);
    })
    .catch(e => {
      console.error(e);
      window.alert(e.message);
    });
});
byId("preview").addEventListener("click", function(e) {
  setPreview();
});
const formatTime = ms => {
  const asiaTime = new Date(ms).toLocaleString("en-US", {
    timeZone: "Asia/Ho_Chi_Minh"
  });
  const d = new Date(asiaTime);
  return `${d.getDate()}/${d.getMonth() + 1} ${d.getHours()}:${String(
    d.getMinutes()
  ).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
};

function setPreview() {
  const info = getAllField();
  const botname = getField("botname");
  document.getElementById("description").innerHTML =
    `<b>${botname}</b> <br>` +
    getDescription(info) +
    `<br><br><b>Trận ${info.host} - ${info.visitor}</b> (${formatTime(
      info.deadline
    )})`;

  byId(
    "matchInfo"
  ).innerHTML = `<span>Trận ${info.host} - ${info.visitor}</span>`;
  byId("matchQuestion").innerHTML = `<span>${info.question}</span>`;
  byId("matchAnswers1").innerHTML = `<span>${info.answers[0]}</span>`;
  byId("matchAnswers2").innerHTML = `<span>${info.answers[1]}</span>`;
  byId("matchAnswers3").innerHTML = `<span>${info.answers[2]}</span>`;
}

function getDescription(info) {
  const link = domain =>
    `<a href='https://${domain}' target='_blank'>${domain}</a>`;
  const linkSky = link("skygarden.vn");
  const topNum = getField("topNum");
  const awardNum = getField("awardNum");
  const awardLink = getField("awardLink");

  let resp = `Giải thưởng:<br>
  - ${info.top * topNum} ${info.topAward} cho ${
    info.top
  } bạn đoán đúng may mắn nhất<br>
  - ${awardNum} <a href='${awardLink}' target='_blank'>${info.award}</a>
  cho TẤT CẢ người đoán đúng.<br>
  Nhận tại các nhà hàng thuộc ${linkSky} ở TP HCM.`;
  return resp;
}
