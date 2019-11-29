// This webpack config is for sample client in 'web' folder

const path = require('path')

const CopyWebpackPlugin = require('copy-webpack-plugin')

module.exports = {
  entry: {
    index: path.resolve(__dirname, './web/index.js'),
    transfer: path.resolve(__dirname, './web/transfer.js'),
    deploy: path.resolve(__dirname, './web/deploy.js'),
    contract: path.resolve(__dirname, './web/contract.js'),
    wallet: path.resolve(__dirname, './web/wallet.js'),
    tx: path.resolve(__dirname, './web/tx.js'),
    bot: path.resolve(__dirname, './web/bot.js'),
    botstore: path.resolve(__dirname, './web/botstore.js'),
    profile: path.resolve(__dirname, './web/profile.js'),
    address: path.resolve(__dirname, './web/address.js'),
    block: path.resolve(__dirname, './web/block.js'),
    election: path.resolve(__dirname, './web/election.js'),
    playground: path.resolve(__dirname, './web/playground.js'),
    loanhSetMatchInfo: path.resolve(__dirname, './web/loanhSetMatchInfo.js')
  },
  output: {
    path: path.resolve(__dirname, 'web_dist'),
    filename: '[name].js'
  },

  resolve: {
    alias: {
      vue: 'vue/dist/vue.js'
    }
  },

  plugins: [
    new CopyWebpackPlugin([
      { from: path.resolve(__dirname, 'web'), ignore: ['*.js'] }
    ])
  ],

  node: {
    fs: 'empty'
  }
}
