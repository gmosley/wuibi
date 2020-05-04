const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  plugins: [
    // for now, copy js/css instead of bundling
    new CopyPlugin([
      {
        from: 'node_modules/webextension-polyfill/dist/browser-polyfill.js',
        to: '.'
      },
      {
        from: 'node_modules/shaka-player/dist/shaka-player.ui.debug.js',
        to: '.'
      },
      {
        from: 'node_modules/shaka-player/dist/controls.css',
        to: '.'
      },
    ]),
  ],
};