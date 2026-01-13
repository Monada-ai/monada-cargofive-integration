const webpack = require('webpack');
const pkg = require('./package.json');
const path = require('path');
const libraryName= pkg.name;
module.exports = {
    entry: path.join(__dirname, "./src/client/index.js"),
    plugins: [
    ],
    mode: 'production',
    output: {
        path: path.join(__dirname, './dist/client'),
        filename: 'index.js',
        library: libraryName,
        libraryTarget: 'umd',
        publicPath: '/dist/client',
        umdNamedDefine: true
    },
    module: {
        rules : [
        {
            test: /\.(js|jsx)$/,
            use: {
                loader: "babel-loader",
                options: {
                    presets: ['@babel/preset-env', '@babel/preset-react']
                }
            },
            include: path.resolve(__dirname, "src"),
            exclude: /node_modules/,
        }]
    },
    externals: {
        '@emotion/react': '@emotion/react',
        '@emotion/styled': '@emotion/styled',
        '@fortawesome/pro-light-svg-icons': '@fortawesome/pro-light-svg-icons',
        '@fortawesome/pro-solid-svg-icons': '@fortawesome/pro-solid-svg-icons',
        '@fortawesome/react-fontawesome': '@fortawesome/react-fontawesome',
        '@monada-ai/monada-shipping-companies-logos': '@monada-ai/monada-shipping-companies-logos',
        '@mui': '@mui',
        '@mui/lab': '@mui/lab',
        '@mui/material': '@mui/material',
        'axios': 'axios',
        'currency-list': 'currency-list',
        'lodash': 'lodash',
        'mui': 'mui',
        'prop-types': 'prop-types',
        'react': 'react',
        'react-dnd': 'react-dnd',
        'react-dnd-html5-backend': 'react-dnd-html5-backend',
        'react-dom': 'react-dom'
    },
};
