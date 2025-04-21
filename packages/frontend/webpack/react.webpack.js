const HtmlWebpackPlugin = require("html-webpack-plugin");
const path = require("path");
const threadLoader = require('thread-loader');
const { EsbuildPlugin } = require('esbuild-loader');

// Warm up thread-loader
threadLoader.warmup(
  {
    workers: 4,
    workerParallelJobs: 50,
  },
  ['ts-loader', 'css-loader', 'postcss-loader']
);

const rootPath = path.resolve(__dirname, "..");
const projectRoot = path.resolve(rootPath, "../..");

const config = {
  resolve: {
    extensions: [".tsx", ".ts", ".js"],
    mainFields: ["main", "module", "browser"],
    alias: {
      'react': path.resolve('./node_modules/react'),
      'react-dom': path.resolve('./node_modules/react-dom'),
      'osx-temperature-sensor': false
    },
    fallback: {
      'osx-temperature-sensor': false
    }
  },
  entry: path.resolve(rootPath, "src/renderer", "index.tsx"),
  target: "electron-renderer",
  devtool: process.env.NODE_ENV === 'development' ? 'eval-cheap-module-source-map' : 'source-map',
  cache: {
    type: 'filesystem',
    buildDependencies: {
      config: [__filename]
    }
  },
  optimization: {
    minimizer: [
      new EsbuildPlugin({
        target: 'es2015',
        css: true
      })
    ],
    moduleIds: 'deterministic',
    runtimeChunk: 'single',
    splitChunks: {
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all',
        },
      },
    },
  },
  module: {
    rules: [
      {
        test: /\.(js|ts|tsx)$/,
        exclude: /node_modules/,
        include: /src/,
        use: [
          {
            loader: 'thread-loader',
            options: {
              workers: 4,
              workerParallelJobs: 50,
            }
          },
          {
            loader: "esbuild-loader",
            options: {
              loader: 'tsx',
              target: 'es2015',
              tsconfigRaw: require(path.resolve(projectRoot, 'tsconfig.json'))
            }
          }
        ],
      },
      {
        test: /\.css$/,
        use: [
          "style-loader",
          {
            loader: "css-loader",
            options: {
              importLoaders: 1
            }
          },
          "postcss-loader"
        ]
      },
      {
        test: /\.(png|svg|jpg|jpeg|gif)$/i,
        type: "asset/resource",
      },
    ],
  },
  devServer: {
    static: {
      directory: path.resolve(rootPath, "dist/renderer"),
      publicPath: "/",
    },
    headers: {
      'Content-Security-Policy': "default-src 'self' 'unsafe-inline' 'unsafe-eval' http: https: ws: wss:; img-src 'self' data: https: *; style-src 'self' 'unsafe-inline' *; connect-src 'self' * ws: wss: http: https:;"
    },
    port: 8081,
    historyApiFallback: true,
    compress: true,
    hot: true,
    setupMiddlewares: (middlewares, devServer) => {
      if (!devServer) {
        throw new Error('webpack-dev-server is not defined');
      }
      devServer.app.get('/styles.css', (_, response) => {
        response.type('text/css');
        response.sendFile(path.resolve(rootPath, 'dist/renderer/styles.css'));
      });
      return middlewares;
    }
  },
  output: {
    path: path.resolve(rootPath, "dist/renderer"),
    filename: "js/[name].js",
    publicPath: process.env.NODE_ENV === "development" ? "/" : "./"
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: path.resolve(rootPath, "index.html"),
      meta: {
        'Content-Security-Policy': {
          'http-equiv': 'Content-Security-Policy',
          'content': "default-src 'self' 'unsafe-inline' 'unsafe-eval' http: https: ws: wss:; img-src 'self' data: https: *; style-src 'self' 'unsafe-inline' *; connect-src 'self' * ws: wss: http: https:;"
        }
      }
    }),
  ],
};

module.exports = config; 
