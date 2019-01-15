var path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin')

module.exports = {
    mode: 'development',
    entry: {
        index: './src/index.js',
        transfer: './src/transfer.js',
        deploy: './src/deploy.js',
        contract: './src/contract.js'
    },
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: '[name].js',
    },
    plugins: [
        new CopyWebpackPlugin([{from: 'src', ignore: [ '*.js' ]}])
    ],
    devServer: {
        proxy: {
          '/api/**': {
            target: 'http://localhost:3000',
            secure: false,
            changeOrigin: true,
          }
        },
      },
};
