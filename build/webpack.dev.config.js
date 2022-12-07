const path = require('path');
const webpack = require('webpack');
const pckg = require('../package.json');

const { merge } = require('webpack-merge');
const baseWpConfig = require('./webpack.base.config');

baseWpConfig.entry.unshift('webpack-hot-middleware/client');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

const publicDir = path.resolve(__dirname, `../server/.${pckg.name}/public`);
const clientDir = path.resolve(__dirname, '../client');

module.exports = merge(baseWpConfig, {
    mode: 'development',
    devtool: 'inline-source-map',
    output: {
        path: `${publicDir}${baseWpConfig.output.publicPath}`,
        filename: 'bundle.js',
    },

    module: {
        rules: [
            {
                test: /\.css$/,
                use: [
                  'vue-style-loader',
                  'css-loader'
                ]
            },
        ]
    },

    plugins: [
        new webpack.HotModuleReplacementPlugin(),
        new webpack.NoEmitOnErrorsPlugin(),
        new HtmlWebpackPlugin({
            template: `${clientDir}/index.html.template`,
            filename: `${publicDir}/index.html`
        }),
        new CopyWebpackPlugin({patterns: [{context: `${clientDir}/assets`, from: `${clientDir}/assets/*`, to: `${publicDir}/`}]})
    ]
});
