import * as esbuild from 'esbuild';
import { readFile, rm } from 'node:fs/promises';

const isWatch = process.argv.includes('--watch');
const isProduction = !isWatch;

const cssTextPlugin = {
  name: 'css-text',
  setup(build) {
    build.onLoad({ filter: /\.css$/ }, async (args) => {
      const source = await readFile(args.path, 'utf8');
      const result = await esbuild.transform(source, {
        loader: 'css',
        minify: isProduction
      });

      return {
        contents: `export default ${JSON.stringify(result.code.trim())};`,
        loader: 'js'
      };
    });
  }
};

const ctx = await esbuild.context({
  entryPoints: ['src/main.ts'],
  bundle: true,
  format: 'iife',
  globalName: 'JellyfinMediaPreviewBundle',
  target: 'es2020',
  minify: isProduction,
  sourcemap: !isProduction,
  outfile: 'dist/mediapreview.bundle.js',
  plugins: [cssTextPlugin]
});

if (isWatch) {
  await ctx.watch();
} else {
  await ctx.rebuild();
  await ctx.dispose();
  await rm('dist/mediapreview.bundle.js.map', { force: true });
}
