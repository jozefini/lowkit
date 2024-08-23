import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    store: 'src/store/index.ts', // 'package/store'
    hooks: 'src/hooks/index.ts', // 'package/hooks'
    logger: 'src/logger/index.ts', // 'package/logger'
    crypto: 'src/crypto/index.ts', // 'package/crypto'
    utils: 'src/utils/index.ts', // 'package/utils'
  },
  splitting: false,
  sourcemap: true,
  minify: true,
  clean: false,
  dts: true,
  outDir: './',
  external: ['react'],
  format: ['esm', 'cjs'], // Add this line to output both ES modules and CommonJS
})
