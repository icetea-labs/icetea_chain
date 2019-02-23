import SafeBuffer from 'safe-buffer'
const codec = require('../icetea/helper/codec')

export function replaceAll (text, search, replacement) {
  return text.split(search).join(replacement)
}

export function tryParseJson (p) {
  try {
    return JSON.parse(p)
  } catch (e) {
    // console.log("WARN: ", e);
    return p
  }
}

export function tryStringifyJson (p) {
  try {
    return JSON.stringify(p)
  } catch (e) {
    // console.log("WARN: ", e);
    return p
  }
}

export function parseParamList (pText) {
  pText = replaceAll(pText, '\r', '\n')
  pText = replaceAll(pText, '\n\n', '\n')
  let params = pText.split('\n').filter(e => e.trim()).map(tryParseJson)

  return params
}

export function encodeTX (data, enc = 'base64') {
  return codec.encode(data).toString(enc)
}

export function toBuffer (text, enc) {
  return SafeBuffer.Buffer.from(text, enc)
}

export function switchEncoding (str, from, to) {
  return SafeBuffer.Buffer.from(str, from).toString(to)
}

export function decodeTX (data, enc = 'base64') {
  return codec.decode(toBuffer(data, enc))
}

export function detectCallType (decorators) {
  if (!decorators) {
    return 'unknown'
  }
  if (decorators.includes('payable')) {
    return 'transaction'
  } else if (decorators.includes('transaction')) {
    return 'transaction'
  }

  return 'view'
}
