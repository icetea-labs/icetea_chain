var path = require('path');

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
    }
};