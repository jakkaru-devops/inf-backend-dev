const { merge } = require('webpack-merge');
const common = require('./webpack.common.js');

module.exports = merge(common, {
  mode: 'development',
  watch: false,
  output: {
    filename: 'server.js',
    path: __dirname + '/dist/dev',
  },
  devtool: 'source-map',
});
