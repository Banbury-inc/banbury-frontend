const HtmlWebpackPlugin = require("html-webpack-plugin");
const CopyWebpackPlugin = require('copy-webpack-plugin');
const path = require("path");
const threadLoader = require('thread-loader');
const { EsbuildPlugin } = require('esbuild-loader');

// Warm up thread-loader
threadLoader.warmup(
  {
    workers: 2,
    workerParallelJobs: 30,
  },
  ['ts-loader', 'css-loader', 'postcss-loader']
);

const rootPath = path.resolve(__dirname, "..");
const projectRoot = path.resolve(rootPath, "../..");

const config = {
  stats: {
    children: false,
    modules: false,
  },
  performance: {
    hints: false,
    maxEntrypointSize: 512000,
    maxAssetSize: 512000,
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js"],
    mainFields: ["main", "module", "browser"],
    alias: {
      'react': path.resolve('./node_modules/react'),
      'react-dom': path.resolve('./node_modules/react-dom'),
      'osx-temperature-sensor': false,
      'canvas': false
    },
    fallback: {
      'osx-temperature-sensor': false,
      'canvas': false
    }
  },
  entry: path.resolve(rootPath, "src/renderer", "index.tsx"),
  target: "electron-renderer",
  devtool: process.env.NODE_ENV === 'development' ? 'eval-cheap-module-source-map' : 'nosources-source-map',
  cache: {
    type: 'filesystem',
    buildDependencies: {
      config: [__filename]
    },
    compression: 'gzip',
    maxAge: 172800000, // 2 days
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
      chunks: 'all',
      maxInitialRequests: 25,
      minSize: 20000,
      cacheGroups: {
        default: {
          minChunks: 1,
          priority: -20,
          reuseExistingChunk: true,
        },
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all',
          priority: -10,
        },
        mui: {
          test: /[\\/]node_modules[\\/]@mui[\\/]/,
          name: 'mui',
          chunks: 'all',
          priority: 10,
        },
        react: {
          test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
          name: 'react',
          chunks: 'all',
          priority: 20,
        },
        tiptap: {
          test: /[\\/]node_modules[\\/]@tiptap[\\/]/,
          name: 'tiptap',
          chunks: 'all',
          priority: 10,
        },
        ai: {
          test: /[\\/]node_modules[\\/](@ai-sdk|@assistant-ui|ai)[\\/]/,
          name: 'ai',
          chunks: 'all',
          priority: 10,
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
              workers: 2,
              workerParallelJobs: 30,
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
      'Content-Security-Policy': "default-src 'self' 'unsafe-inline' 'unsafe-eval' http: https: ws: wss:; img-src 'self' data: blob: file: https: *; media-src 'self' data: blob: file: https: *; style-src 'self' 'unsafe-inline' *; connect-src 'self' * ws: wss: http: https:;"
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
          'content': "default-src 'self' 'unsafe-inline' 'unsafe-eval' http: https: ws: wss:; img-src 'self' data: blob: file: https: *; media-src 'self' data: blob: file: https: *; style-src 'self' 'unsafe-inline' *; connect-src 'self' * ws: wss: http: https:;"
        }
      }
    }),
    new CopyWebpackPlugin({
      patterns: [
        {
          from: path.join(path.resolve(projectRoot, 'node_modules'), 'pdfjs-dist', 'build', 'pdf.worker.min.js'),
          to: 'pdf.worker.min.js'
        },
        {
          from: path.resolve(rootPath, 'static'),
          to: 'static'
        }
      ]
    }),
  ],
};

module.exports = config; 
