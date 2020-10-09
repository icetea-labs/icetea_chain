const axios = require('./axios')

exports.healthCheck = async () => {
  return await axios.get('http://localhost:26657/health')
}
