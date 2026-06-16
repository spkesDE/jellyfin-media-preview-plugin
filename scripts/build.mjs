import * as esbuild from 'esbuild';
import { createHash } from 'node:crypto';
import { readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { compileScript, compileTemplate, parse } from '@vue/compiler-sfc';

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

const vueSfcPlugin = {
  name: 'vue-sfc',
  setup(build) {
    let compileQueue = Promise.resolve();

    build.onLoad({ filter: /\.vue$/ }, async (args) => {
      const compile = async () => {
        const source = await readFile(args.path, 'utf8');
        const { descriptor, errors } = parse(source, { filename: args.path });

        if (errors.length) {
          return {
            errors: errors.map((error) => ({
              text: error instanceof Error ? error.message : String(error)
            }))
          };
        }

        const id = createHash('sha256').update(args.path).digest('hex').slice(0, 12);
        if (!descriptor.script && !descriptor.scriptSetup) {
          const compiledTemplate = compileTemplate({
            source: descriptor.template?.content ?? '',
            filename: args.path,
            id
          });

          return {
            contents: [
              compiledTemplate.code,
              'const __script = {};',
              '__script.render = render;',
              'export default __script;'
            ].join('\n'),
            loader: 'js',
            resolveDir: path.dirname(args.path)
          };
        }

        let compiledScript;
        try {
          compiledScript = compileScript(descriptor, {
            id,
            inlineTemplate: true
          });
        } catch (error) {
          console.error(`Failed to compile Vue SFC: ${args.path}`);
          throw error;
        }

        return {
          contents: compiledScript.content,
          loader: descriptor.script?.lang === 'js' ? 'js' : 'ts',
          resolveDir: path.dirname(args.path)
        };
      };

      const result = compileQueue.then(compile);
      compileQueue = result.then(() => undefined, () => undefined);
      return result;
    });
  }
};

const sharedOptions = {
  bundle: true,
  format: 'iife',
  target: 'es2020',
  minify: isProduction,
  sourcemap: !isProduction,
  legalComments: 'inline'
};

const contexts = await Promise.all([
  esbuild.context({
    ...sharedOptions,
    entryPoints: ['src/main.ts'],
    globalName: 'JellyfinMediaPreviewBundle',
    outfile: 'dist/mediapreview.bundle.js',
    plugins: [cssTextPlugin]
  }),
  esbuild.context({
    ...sharedOptions,
    entryPoints: ['src/config/main.ts'],
    globalName: 'JellyfinMediaPreviewConfigBundle',
    outfile: 'dist/config.bundle.js',
    plugins: [vueSfcPlugin, cssTextPlugin]
  })
]);

if (isWatch) {
  await Promise.all(contexts.map((ctx) => ctx.watch()));
} else {
  await Promise.all(contexts.map((ctx) => ctx.rebuild()));
  await Promise.all(contexts.map((ctx) => ctx.dispose()));
  await Promise.all([
    rm('dist/mediapreview.bundle.js.map', { force: true }),
    rm('dist/config.bundle.js.map', { force: true })
  ]);
}
