import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    store: 'src/store/index.ts',
    hooks: 'src/hooks/index.ts',
  },
  splitting: false,
  sourcemap: true,
  minify: true,
  clean: false,
  dts: true,
  outDir: './',
  external: ['react'],
})
