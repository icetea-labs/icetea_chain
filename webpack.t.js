const merge = require('webpack-merge')
const common = require('./webpack.common.js')
const Dotenv = require('dotenv-webpack')

module.exports = merge(common, {
  mode: 'production',
  plugins: [
    new Dotenv({
      path: './.env.test' // Path to .env file (this is the default)
    })
  ]
})
