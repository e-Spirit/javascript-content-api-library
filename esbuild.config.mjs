import * as esbuild from 'esbuild'
import AnalyzerPlugin from 'esbuild-analyzer'
import fs from 'fs'

const pkg = JSON.parse(fs.readFileSync('./package.json', 'utf-8'))

// Externe Dependencies (nicht bündeln)
const external = [
  ...Object.keys(pkg.dependencies || {}),
  ...Object.keys(pkg.peerDependencies || {}),
  ...Object.keys(pkg.optionalDependencies || {}),
  'util'
]

// Gemeinsame Build-Optionen für Node.js (Main Bundle)
const commonNodeOptions = {
  bundle: true,
  target: 'es2015',
  sourcemap: true,
  minify: true,
  treeShaking: true,
  legalComments: 'none',
  logLevel: 'info',
  external,
  minifyWhitespace: true,
  minifySyntax: true,
  metafile: true,
}

// Gemeinsame Build-Optionen für Browser (Proxy Bundle)
const browserOptions = {
  bundle: true,
  platform: 'browser',
  target: 'es2020',
  format: 'esm',
  sourcemap: true,
  minify: true,
  treeShaking: true,
  legalComments: 'none',
  logLevel: 'info',
  external,
  minifyWhitespace: true,
  minifySyntax: true,
  metafile: true,
  charset: 'utf8',
}

// Stats-Verzeichnis erstellen
if (!fs.existsSync('stats')) {
  fs.mkdirSync('stats', { recursive: true })
}

// Main Bundle (fsxa-api)
console.log('Building main bundle (fsxa-api)...')

// CJS build - use platform: 'node' for proper CommonJS exports
await esbuild.build({
  ...commonNodeOptions,
  platform: 'node',
  entryPoints: ['src/index.ts'],
  outfile: 'dist/fsxa-api.cjs.js',
  format: 'cjs',
  plugins: [
    AnalyzerPlugin({
      outfile: 'stats/fsxa-api-cjs.html',
    })
  ],
})

// ESM build - use platform: 'neutral' to avoid Node.js-specific code
await esbuild.build({
  ...commonNodeOptions,
  platform: 'neutral',
  entryPoints: ['src/index.ts'],
  outfile: 'dist/fsxa-api.es5.js',
  format: 'esm',
  plugins: [
    AnalyzerPlugin({
        outfile: 'stats/fsxa-api-es5.html',
    })
  ],
})

console.log('Main bundle built successfully!')

// Proxy Bundle (fsxa-proxy-api)
console.log('Building proxy bundle (fsxa-proxy-api)...')

await esbuild.build({
  ...browserOptions,
  entryPoints: ['src/proxy.ts'],
  outfile: 'proxy/dist/fsxa-proxy-api.cjs.js',
  format: 'cjs',
  plugins: [
    AnalyzerPlugin({
      outfile: 'stats/fsxa-proxy-api-cjs.html',
    })
  ],
})

await esbuild.build({
  ...browserOptions,
  entryPoints: ['src/proxy.ts'],
  outfile: 'proxy/dist/fsxa-proxy-api.es5.js',
  format: 'esm',
  plugins: [
    AnalyzerPlugin({
      outfile: 'stats/fsxa-proxy-api-es5.html',
    })
  ],
})

console.log('Proxy bundle built successfully!')

// Bundle-Größen ausgeben
console.log('\n📦 Bundle Sizes:')
console.log('─'.repeat(60))

const files = [
  'dist/fsxa-api.cjs.js',
  'dist/fsxa-api.es5.js',
  'proxy/dist/fsxa-proxy-api.cjs.js',
  'proxy/dist/fsxa-proxy-api.es5.js',
]

files.forEach((file) => {
  if (fs.existsSync(file)) {
    const stats = fs.statSync(file)
    const sizeKB = (stats.size / 1024).toFixed(2)
    console.log(`${file.padEnd(45)} ${sizeKB.padStart(10)} KB`)
  }
})

console.log('─'.repeat(60))

console.log('\n✓ Bundle analysis reports generated:')
console.log('  - stats/fsxa-api-cjs.html')
console.log('  - stats/fsxa-api-es5.html')
console.log('  - stats/fsxa-proxy-api-cjs.html')
console.log('  - stats/fsxa-proxy-api-es5.html')
console.log('\nBuild complete!')
