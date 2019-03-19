// This webpack config is for sample client in 'web' folder

const path = require('path')

const CopyWebpackPlugin = require('copy-webpack-plugin')

module.exports = {
  mode: 'development',
  entry: {
    index: './web/index.js',
    transfer: './web/transfer.js',
    deploy: './web/deploy.js',
    contract: './web/contract.js',
    wallet: './web/wallet.js',
    tx: './web/tx.js',
    bot: './web/bot.js',
    test: './web/playground.js'
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
    new CopyWebpackPlugin([{ from: 'web', ignore: [ '*.js' ] }])
  ],

  devServer: {
    contentBase: 'web',
    port: 3001,
    overlay: true,
    proxy: {
      '/api': {
        target: 'http://localhost:26657',
        pathRewrite: { '^/api': '' },
        secure: false,
        changeOrigin: true
      }
    }
  }
}
