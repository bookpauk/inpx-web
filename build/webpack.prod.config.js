const fs = require('fs-extra');
const path = require('path');
//const webpack = require('webpack');

const { merge } = require('webpack-merge');
const baseWpConfig = require('./webpack.base.config');
const TerserPlugin = require('terser-webpack-plugin');
const CssMinimizerWebpackPlugin = require('css-minimizer-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

const publicDir = path.resolve(__dirname, '../dist/tmp/public');
const clientDir = path.resolve(__dirname, '../client');

fs.emptyDirSync(publicDir);

module.exports = merge(baseWpConfig, {
    mode: 'production',
    output: {
        path: `${publicDir}${baseWpConfig.output.publicPath}`,
        filename: 'bundle.[contenthash].js',
    },
    module: {
        rules: [
            {
                test: /\.css$/,
                use: [
                  MiniCssExtractPlugin.loader,
                  'css-loader'
                ]
            }
        ]
    },
    optimization: {
        minimizer: [
            new TerserPlugin({
                parallel: true,
                terserOptions: {
                    format: {
                        comments: false,
                    },
                },
            }),
            new CssMinimizerWebpackPlugin()
        ]
    },
    plugins: [
        new MiniCssExtractPlugin({
            filename: "[name].[contenthash].css"
        }),
        new HtmlWebpackPlugin({
            template: `${clientDir}/index.html.template`,
            filename: `${publicDir}/index.html`
        }),
        new CopyWebpackPlugin({patterns: 
            [{context: `${clientDir}/assets`, from: `${clientDir}/assets/*`, to: `${publicDir}/` }]
        }),
    ]
});
