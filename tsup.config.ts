import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    store: 'src/store/index.ts',
    hooks: 'src/hooks/index.ts',
    logger: 'src/logger/index.ts',
    crypto: 'src/crypto/index.ts',
    'crypto/generate': 'src/crypto/generate.ts',
    utils: 'src/utils/index.ts',
    auth: 'src/auth/client.tsx',
    'auth/server': 'src/auth/session.ts',
  },
  splitting: false,
  sourcemap: true,
  minify: true,
  clean: false,
  dts: true,
  outDir: './',
  external: ['react', 'next'],
  format: ['esm', 'cjs'], // Add this line to output both ES modules and CommonJS
})
