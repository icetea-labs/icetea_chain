const merge = require('webpack-merge')
const common = require('./webpack.common.js')
const Dotenv = require('dotenv-webpack')
const path = require('path')

module.exports = merge(common, {
  mode: 'development',
  devtool: 'inline-source-map',
  devServer: {
    contentBase: path.resolve(__dirname, './web'),
    port: 3001,
    overlay: true,
    proxy: {
      '/api': {
        target: 'http://localhost:26657',
        pathRewrite: { '^/api': '' },
        secure: false,
        changeOrigin: true
      },
      '/websocket': {
        target: 'ws://localhost:26657',
        secure: false,
        ws: true
      }
    }
  },
  plugins: [
    new Dotenv({
      path: path.resolve(__dirname, './.env.dev') // Path to .env file (this is the default)
    })
  ]
})
