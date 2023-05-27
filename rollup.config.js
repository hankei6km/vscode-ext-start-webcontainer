import typescript from '@rollup/plugin-typescript'
import commonjs from '@rollup/plugin-commonjs'
import { nodeResolve } from '@rollup/plugin-node-resolve'

const extensions = ['.ts', '.js']

export default {
  input: './src/web/extension.ts',
  // bundle single file to out/extension.js as cjs module.
  output: {
    dir: 'out/web',
    format: 'cjs',
    sourcemap: true
  },
  external: ['vscode'],
  plugins: [
    typescript({ outDir: 'out/web' }),
    nodeResolve({
      extensions
    }),
    commonjs({})
  ]
}
