const axios = require('./axios')
const { sendDirect } = require('./send')

exports.healthCheck = async () => {
  try {
    return await axios.get('http://localhost:26657/health')
  } catch (error) {
    if (error.code === 'ECONNABORTED') {
      await sendDirect('Tendermint node being timeout, sending SIGTERM to tendermint node')
    }
    return Promise.reject(error)
  }
}
