import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.tsx',
    store: 'src/store.tsx',
    hooks: 'src/hooks.tsx',
  },
  splitting: true,
  sourcemap: true,
  minify: true,
  clean: false,
  dts: true,
  outDir: './',
  external: ['react', 'react-dom'],
})
