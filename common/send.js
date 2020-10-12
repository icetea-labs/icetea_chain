const axios = require('axios')
const querystring = require('querystring')

exports.sendDirect = async options => {
  if (typeof options === 'string') options = { text: options }
  const postData = querystring.stringify({
    chat_id: process.env.NEWS_RECEIVER,
    ...options
  })
  const opts = {
    url: `https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendMessage`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': postData.length
    },
    data: postData
  }
  return await axios.request(opts)
}
