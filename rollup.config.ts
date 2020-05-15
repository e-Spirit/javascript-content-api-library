import resolve from "@rollup/plugin-node-resolve";
import babel from "@rollup/plugin-babel";
import camelCase from "lodash.camelcase";
import commonjs from "@rollup/plugin-commonjs";
import json from "@rollup/plugin-json";
import pkg from "./package.json";

const name = pkg.name;
const extensions = [".js", ".ts"];

export default {
  input: "src/index.ts",
  output: [
    {
      file: pkg.main,
      name: camelCase(name),
      exports: "named",
      format: "umd",
      sourcemap: true,
    },
    { file: pkg.module, format: "es", sourcemap: true },
  ],
  external: [],
  watch: {
    include: "src/**",
  },
  plugins: [
    resolve({ extensions, preferBuiltins: true, browser: true }),
    json(),
    // Allow bundling cjs modules. Rollup doesn't understand cjs
    commonjs(),
    // Allows node_modules resolution
    // Compile TypeScript/JavaScript files
    babel({
      extensions,
      babelHelpers: "bundled",
      include: ["src/**/*"],
    }),
  ],
};
