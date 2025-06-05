const commonjs = require('@rollup/plugin-commonjs')
const json = require('@rollup/plugin-json')
const resolve = require('@rollup/plugin-node-resolve')
const babel = require('@rollup/plugin-babel')
const terser = require('@rollup/plugin-terser')
const ts = require('rollup-plugin-ts')
const pkg = require('./package.json')
const nodePolyfills = require('rollup-plugin-node-polyfills')
const { optimizeLodashImports } = require('@optimize-lodash/rollup-plugin')
const { visualizer } = require('rollup-plugin-visualizer')

const extensions = ['.js', '.ts']

module.exports = [
  {
    input: 'src/index.ts',
    external: [...Object.keys(pkg.dependencies || {}), ...Object.keys(pkg.peerDependencies || {})],
    output: [
      {
        file: pkg.main,
        format: 'cjs',
      },
      {
        file: pkg.module,
        format: 'esm',
      },
    ],
    plugins: [
      visualizer({
        emitFile: true,
        filename: "stats/fsxa-api.html",
      }),
      ts(),
      json(),
      resolve({ extensions }),
      commonjs(),
      optimizeLodashImports(),
      babel({
        extensions,
        include: ['src/**/*'],
        babelHelpers: 'bundled',
      }),
      terser(),
      nodePolyfills(),
    ],
  },
  {
    input: 'src/proxy.ts',
    external: [...Object.keys(pkg.dependencies || {}), ...Object.keys(pkg.peerDependencies || {})],
    output: [
      {
        file: 'proxy/dist/fsxa-proxy-api.cjs.js',
        format: 'cjs',
      },
      {
        file: 'proxy/dist/fsxa-proxy-api.es5.js',
        format: 'esm',
      },
    ],
    plugins: [
      visualizer({
        emitFile: true,
        filename: "stats/fsxa-proxy-api.html",
      }),
      ts(),
      json(),
      resolve({ extensions }),
      commonjs(),
      optimizeLodashImports(),
      babel({
        extensions,
        include: ['src/proxy.ts'],
        babelHelpers: 'bundled',
      }),
      terser(),
    ],
  },
]

/**import resolve from 'rollup-plugin-node-resolve'
import commonjs from 'rollup-plugin-commonjs'
import sourceMaps from 'rollup-plugin-sourcemaps'
import typescript from 'rollup-plugin-typescript2'
import json from 'rollup-plugin-json'

const pkg = require('./package.json')

export default {
  input: `src/index.ts`,
  output: [
    { file: pkg.main, name: 'fsxa-api', format: 'umd', sourcemap: true },
    { file: pkg.module, format: 'es', sourcemap: true }
  ],
  // Indicate here external modules you don't wanna include in your bundle (i.e.: 'lodash')
  external: [],
  watch: {
    include: 'src/**'
  },
  plugins: [
    // Allow json resolution
    json(),
    // Compile TypeScript files
    typescript({ useTsconfigDeclarationDir: true }),
    // Allow node_modules resolution, so you can use 'external' to control
    // which external modules to include in the bundle
    // https://github.com/rollup/rollup-plugin-node-resolve#usage
    resolve({
      preferBuiltins: true,
      module: true,
      jsnext: true,
      main: true,
      browser: true
    }),
    // Allow bundling cjs modules (unlike webpack, rollup doesn't understand cjs)
    commonjs(),
    // Resolve source maps to the original source
    sourceMaps()
  ]
}**/
