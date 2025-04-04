const webpack = require('webpack');
const path = require('path');
const dotenv = require('dotenv');
const TerserPlugin = require('terser-webpack-plugin');

dotenv.config();

module.exports = {
  devtool: false,
  entry: './index.ts',
  target: 'node',
  externals: {
    assert: 'commonjs assert',
    crypto: 'commonjs crypto',
    fs: 'commonjs fs',
    module: 'commonjs module',
    os: 'commonjs os',
    path: 'commonjs path',
    stream: 'commonjs stream',
  },
  output: {
    filename: 'index.js',
    libraryTarget: 'commonjs2',
    path: path.resolve(__dirname, 'dist'),
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  mode: 'none',
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        exclude: /index\.ts$/,
        terserOptions: {
          compress: {
            drop_console: true,
          },
          output: {
            comments: false,
          },
        },
      }),
    ],
  }
};
