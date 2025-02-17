const HtmlWebpackPlugin = require("html-webpack-plugin");
const path = require("path");

const rootPath = path.resolve(__dirname, "..");

const config = {
  resolve: {
    extensions: [".tsx", ".ts", ".js"],
    mainFields: ["main", "module", "browser"],
    alias: {
      'react': path.resolve('./node_modules/react'),
      'react-dom': path.resolve('./node_modules/react-dom'),
    }
  },
  entry: path.resolve(rootPath, "src/renderer", "index.tsx"),
  target: "electron-renderer",
  devtool: "source-map",
  module: {
    rules: [
      {
        test: /\.(js|ts|tsx)$/,
        exclude: /node_modules/,
        include: /src/,
        use: {
          loader: "ts-loader",
        },
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
      'Content-Security-Policy': "default-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:* ws://localhost:*; img-src 'self' data: https:; style-src 'self' 'unsafe-inline';",
      'Access-Control-Allow-Origin': '*'
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
          'content': "default-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:* ws://localhost:*; img-src 'self' data: https:; style-src 'self' 'unsafe-inline';"
        }
      }
    }),
  ],
};

module.exports = config; 
