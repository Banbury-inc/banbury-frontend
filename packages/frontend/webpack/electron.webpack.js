import path from "path";
import { fileURLToPath } from 'url';
import threadLoader from 'thread-loader';
import { EsbuildPlugin } from 'esbuild-loader';

// Warm up thread-loader
threadLoader.warmup(
  {
    workers: 2,
    workerParallelJobs: 50,
  },
  ['ts-loader']
);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootPath = path.resolve(__dirname, "..");
const projectRoot = path.resolve(rootPath, "../..");

const config = {
  resolve: {
    extensions: [".tsx", ".ts", ".js"],
    alias: {
      'osx-temperature-sensor': false
    }
  },
  devtool: process.env.NODE_ENV === 'development' ? 'eval-cheap-module-source-map' : 'source-map',
  entry: path.resolve(rootPath, "src/main", "main.ts"),
  target: "electron-main",
  cache: {
    type: 'filesystem',
    buildDependencies: {
      config: [__filename]
    }
  },
  optimization: {
    minimizer: [
      new EsbuildPlugin({
        target: 'es2015'
      })
    ]
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
              workerParallelJobs: 50,
            }
          },
          {
            loader: "esbuild-loader",
            options: {
              loader: 'ts',
              target: 'es2015',
              tsconfigRaw: require(path.resolve(projectRoot, 'tsconfig.json'))
            }
          }
        ],
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
