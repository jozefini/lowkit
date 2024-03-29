import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    store: 'src/store.ts',
    hooks: 'src/hooks.ts',
  },
  splitting: true,
  sourcemap: true,
  minify: true,
  clean: false,
  dts: true,
  outDir: './',
  external: ['react', 'react-dom'],
})
