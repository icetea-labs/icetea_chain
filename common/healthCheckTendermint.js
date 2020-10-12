const axios = require('./axios')

exports.healthCheck = async () => {
  try {
    return await axios.get('http://rpc.icetea.io/health')
  } catch (error) {
    return Promise.reject(error)
  }
}
