import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.tsx',
    store: 'src/store.tsx',
    hooks: 'src/loop.tsx',
  },
  splitting: false,
  sourcemap: true,
  minify: true,
  clean: false,
  dts: true,
  outDir: './',
  external: ['react', 'react-dom'],
})
