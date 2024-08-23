import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    store: 'src/store/index.ts',
    hooks: 'src/hooks/index.ts',
    logger: 'src/logger/index.ts',
    crypto: 'src/crypto/index.ts',
    utils: 'src/utils/index.ts',
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
