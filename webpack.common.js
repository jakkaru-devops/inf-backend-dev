const nodeExternals = require('webpack-node-externals');
const path = require('path');

module.exports = {
  entry: './src/app.ts',
  target: 'node',
  externals: [nodeExternals()],
  resolve: {
    extensions: ['.ts', '.js', '.json', '.svg'],
  },
  module: {
    rules: [
      { test: /\.ts?$/, loader: 'babel-loader' },
      { test: /\.ts?$/, loader: 'ts-loader' },
      { enforce: 'pre', test: /\.js$/, loader: 'source-map-loader' },
    ],
  },
};
