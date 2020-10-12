const axios = require('./axios')

exports.healthCheck = async () => {
  try {
    return await axios.get('http://localhost:26657/health')
  } catch (error) {
    return Promise.reject(error)
  }
}
