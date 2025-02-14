import path from "path";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootPath = path.resolve(__dirname, "..");

const config = {
  resolve: {
    extensions: [".tsx", ".ts", ".js"],
    alias: {
      'osx-temperature-sensor': false
    }
  },
  devtool: "source-map",
  entry: path.resolve(rootPath, "src/main", "main.ts"),
  target: "electron-main",
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
    ],
  },
  node: {
    __dirname: false,
  },
  output: {
    path: path.resolve(rootPath, "dist"),
    filename: "[name].js",
  },
};

export default config; 
