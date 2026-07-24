/* eslint-disable @typescript-eslint/no-var-requires */
const { commonRules } = require('./webpack.rules');
const plugins = require('./webpack.plugins');

// Renderer and sandboxed preload bundles cannot depend on Node's __dirname.
const rules = [...commonRules];
rules.push({
  test: /\.css$/,
  use: [{ loader: 'style-loader' }, { loader: 'css-loader' }],
});

module.exports = {
  module: {
    rules,
  },
  plugins: plugins,
  resolve: {
    extensions: ['.js', '.ts', '.jsx', '.tsx', '.css'],
  },
};
