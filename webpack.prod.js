const { merge } = require('webpack-merge');
const common = require('./webpack.common.js');
const TerserPlugin = require('terser-webpack-plugin');

module.exports = merge(common, {
  mode: 'production',
  watch: false,
  output: {
    filename: 'server.js',
    path: __dirname + '/dist/prod',
  },
  devtool: 'source-map',
  optimization: {
    minimizer: [new TerserPlugin(/* additional options here */)],
    // Other optimization options
  },
});
