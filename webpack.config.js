/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

'use strict';

//@ts-check

// See https://github.com/Microsoft/vscode-azuretools/wiki/webpack for guidance

<<<<<<< HEAD
const process = require('process');
const dev = require("@microsoft/vscode-azext-dev");

let DEBUG_WEBPACK = !/^(false|0)?$/i.test(process.env.DEBUG_WEBPACK || '');

let config = dev.getDefaultWebpackConfig({
    projectRoot: __dirname,
    verbosity: DEBUG_WEBPACK ? 'debug' : 'normal',
    externals:
    {
        // Fix "Module not found" errors in ./node_modules/websocket/lib/{BufferUtil,Validation}.js
        // These files are not in node_modules and so will fail normally at runtime and instead use fallbacks.
        // Make them as external so webpack doesn't try to process them, and they'll simply fail at runtime as before.
        '../build/Release/validation': 'commonjs ../build/Release/validation',
        '../build/default/validation': 'commonjs ../build/default/validation',
        '../build/Release/bufferutil': 'commonjs ../build/Release/bufferutil',
        '../build/default/bufferutil': 'commonjs ../build/default/bufferutil',
=======
// const dev = require("vscode-azureextensiondev");
const TerserPlugin = require('terser-webpack-plugin');
const path = require('path');
const webpack = require('webpack');
const { optimize } = require('webpack');

let DEBUG_WEBPACK = !/^(false|0)?$/i.test(process.env.DEBUG_WEBPACK || '');

let config = {
    mode: 'none',
    context: __dirname,

    // vscode extensions run in a Node.js context, see https://webpack.js.org/configuration/node/
    target: 'webworker',
    entry: {
        // Note: Each entry is a completely separate Node.js application that cannot interact with any
        // of the others, and that individually includes all dependencies necessary (i.e. common
        // dependencies will have a copy in each entry file, no sharing).
        // The entrypoint bundle for this extension, see https://webpack.js.org/configuration/entry-context/
        extension: './src/extension.ts'
    },

    output: {
        // The bundles are stored in the 'dist' folder (check package.json), see https://webpack.js.org/configuration/output/
        path: path.join(__dirname, './dist', 'web'),
        filename: 'azure-resources.js',
        chunkFilename: 'feature-[name].js',
        libraryTarget: 'commonjs2'
    },

    // Create .map.js files for debugging
    devtool: 'source-map', // create a source map that points to the original source file

    externals: {
        // Modules that cannot be webpack'ed, see https://webpack.js.org/configuration/externals/

        // The vscode-module is created on-the-fly so must always be excluded.
        vscode: 'commonjs vscode',

        // Caller-provided externals
    },
    optimization: {
        minimizer: [
            new TerserPlugin({
                terserOptions: {
                    // https://github.com/webpack-contrib/terser-webpack-plugin/

                    // Don't mangle class names.  Otherwise parseError() will not recognize user cancelled errors (because their constructor name
                    // will match the mangled name, not UserCancelledError).  Also makes debugging easier in minified code.
                    keep_classnames: true,

                    // Don't mangle function names. https://github.com/microsoft/vscode-azurestorage/issues/525
                    keep_fnames: true
                }
            })
        ],
        splitChunks: false
    },
    plugins: [
        new optimize.LimitChunkCountPlugin({ maxChunks: 1 }),

        // Fix error:
        //   > WARNING in ./node_modules/ms-rest/lib/serviceClient.js 441:19-43
        //   > Critical dependency: the request of a dependency is an expression
        // in this code:
        //   let data = require(packageJsonPath);
        //
        new webpack.ContextReplacementPlugin(
            // Whenever there is a dynamic require that webpack can't analyze at all (i.e. resourceRegExp=/^\./), ...
            /^\./,
            // CONSIDER: Is there a type for the context argument?  Can't seem to find one.
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (context) => {
                // ... and the call was from within node_modules/ms-rest/lib...
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                if (/node_modules[/\\]ms-rest[/\\]lib/.test(context.context)) {
                    /* CONSIDER: Figure out how to make this work properly.

                        // ... tell webpack that the call may be loading any of the package.json files from the 'node_modules/azure-arm*' folders
                        // so it will include those in the package to be available for lookup at runtime
                        context.request = path.resolve(options.projectRoot, 'node_modules');
                        context.regExp = /azure-arm.*package\.json/;
                    */

                    // In the meantime, just ignore the error by telling webpack we've solved the critical dependency issue.
                    // The consequences of ignoring this error are that
                    //   the Azure SDKs (e.g. azure-arm-resource) don't get their info stamped into the user agent info for their calls.
                    /* eslint-disable @typescript-eslint/no-unsafe-member-access */
                    for (const d of context.dependencies) {
                        if (d.critical) {
                            d.critical = false;
                        }
                    }
                    /* eslint-enable @typescript-eslint/no-unsafe-member-access */
                }
            }),
        new webpack.ProvidePlugin({
            process: 'process/browser'
        }),
    ],

    resolve: {
        mainFields: ["browser", "module", "main"], // look for `browser` entry point in imported node modules
        // Support reading TypeScript and JavaScript files, see https://github.com/TypeStrong/ts-loader
        // These will be automatically transpiled while being placed into dist/extension.bundle.js
        extensions: ['.ts', '.js'],
        fallback: {
            // Webpack 5 no longer polyfills Node.js core modules automatically.
            // see https://webpack.js.org/configuration/resolve/#resolvefallback
            // for the list of Node.js core module polyfills.
            "net": require.resolve("net-browserify"),
            "crypto": require.resolve("crypto-browserify"),
            "path": require.resolve("path-browserify"),
            "os": require.resolve("os-browserify/browser"),
            "url": require.resolve("url/"),
            "util": require.resolve("util/"),
            "stream": require.resolve("stream-browserify"),
            "http": require.resolve("stream-http"),
            "querystring": require.resolve("querystring-es3"),
            "zlib": require.resolve("browserify-zlib"),
            "assert": require.resolve("assert/"),
            "process": require.resolve("process/browser"),
            "https": require.resolve("https-browserify"),
            "console": require.resolve('console-browserify'),
            "async_hooks": false,
            "child_process": false,
            "fs": false
        }
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                exclude: /node_modules/,
                use: [{
                    // Note: the TS loader will transpile the .ts file directly during webpack (i.e., webpack is directly pulling the .ts files, not .js files from out/)
                    loader: 'ts-loader'
                }]
            }

            // Note: If you use`vscode-nls` to localize your extension than you likely also use`vscode-nls-dev` to create language bundles at build time.
            // To support webpack, a loader has been added to vscode-nls-dev .Add the section below to the`modules/rules` configuration.
            // {
            //     // vscode-nls-dev loader:
            //     // * rewrite nls-calls
            //     loader: require.resolve('vscode-nls-dev/lib/webpack-loader'),
            //     options: {
            //         base: path.join(__dirname, 'src')
            //     }
            // }

            // Caller-supplied rules
        ]
>>>>>>> 014b579 (WIP for vscode.dev)
    }
});

if (DEBUG_WEBPACK) {
    console.log('Config:', config);
}

module.exports = config;
