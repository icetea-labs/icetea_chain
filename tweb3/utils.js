const Buffer = require('safe-buffer').Buffer
const codec = require('../icetea/helper/codec')

exports.replaceAll = (text, search, replacement) => {
  return text.split(search).join(replacement)
}

exports.tryParseJson = p => {
  try {
    return JSON.parse(p)
  } catch (e) {
    // console.log("WARN: ", e);
    return p
  }
}

exports.tryStringifyJson = p => {
  try {
    return JSON.stringify(p)
  } catch (e) {
    // console.log("WARN: ", e);
    return p
  }
}

exports.encodeTX = (data, enc = 'base64') => {
  return codec.encode(data).toString(enc)
}

exports.toBuffer = (text, enc) => {
  return Buffer.from(text, enc)
}

exports.switchEncoding = (str, from, to) => {
  return Buffer.from(str, from).toString(to)
}

exports.decodeTX = (data, enc = 'base64') => {
  return codec.decode(exports.toBuffer(data, enc))
}

