import typescript from '@rollup/plugin-typescript';
import terser from '@rollup/plugin-terser';

export default [
  // ESM (full)
  {
    input: 'index.ts',
    output: {
      file: 'dist/index.js',
      format: 'es',
      sourcemap: true,
    },
    plugins: [
      typescript({
        tsconfig: './tsconfig.build.json',
        declaration: true,
        declarationDir: './dist',
      }),
    ],
  },
  // ESM (minified)
  {
    input: 'index.ts',
    output: {
      file: 'dist/index.min.js',
      format: 'es',
      sourcemap: true,
    },
    plugins: [
      typescript({
        tsconfig: './tsconfig.build.json',
        declaration: false,
      }),
      terser({
        compress: {
          pure_getters: true,
          passes: 2,
        },
        format: {
          comments: false,
        },
      }),
    ],
  },
  // UMD (for browsers via <script>)
  {
    input: 'index.ts',
    output: {
      file: 'dist/index.umd.js',
      format: 'umd',
      name: 'DomUnify',
      sourcemap: true,
      exports: 'named',
    },
    plugins: [
      typescript({
        tsconfig: './tsconfig.build.json',
        declaration: false,
      }),
      terser({
        compress: {
          pure_getters: true,
          passes: 2,
        },
        format: {
          comments: false,
        },
      }),
    ],
  },
];
