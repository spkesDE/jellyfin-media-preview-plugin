import * as esbuild from 'esbuild';
import { readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import vue from '@vitejs/plugin-vue';
import { build as viteBuild } from 'vite';

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

function injectEmittedCss(styleId) {
  return {
    name: 'media-preview-inject-emitted-css',
    enforce: 'post',
    generateBundle(_options, bundle) {
      const cssAssets = Object.entries(bundle).filter(
        ([, output]) => output.type === 'asset' && output.fileName.endsWith('.css')
      );
      if (!cssAssets.length) return;

      const css = cssAssets
        .map(([, asset]) => (typeof asset.source === 'string' ? asset.source : new TextDecoder().decode(asset.source)))
        .join('\n');
      for (const [fileName] of cssAssets) delete bundle[fileName];

      const injection = [
        `const __styleId=${JSON.stringify(styleId)};`,
        'if(!document.getElementById(__styleId)){',
        'const __style=document.createElement("style");',
        '__style.id=__styleId;',
        `__style.textContent=${JSON.stringify(css)};`,
        '(document.head||document.documentElement).appendChild(__style);',
        '}'
      ].join('');
      const strictDirective = '"use strict";';

      for (const output of Object.values(bundle)) {
        if (output.type === 'chunk' && output.isEntry) {
          const entryCode = output.code.startsWith(strictDirective)
            ? output.code.slice(strictDirective.length)
            : output.code;
          output.code = strictDirective + injection + entryCode;
        }
      }
    }
  };
}

const sharedOptions = {
  bundle: true,
  format: 'iife',
  target: 'es2020',
  minify: isProduction,
  sourcemap: !isProduction,
  legalComments: 'inline'
};

const runtimeContext = await esbuild.context({
  ...sharedOptions,
  entryPoints: ['src/main.ts'],
  globalName: 'JellyfinMediaPreviewBundle',
  outfile: 'dist/mediapreview.bundle.js',
  plugins: [cssTextPlugin]
});

const configBuild = () =>
  viteBuild({
    configFile: false,
    mode: isWatch ? 'development' : 'production',
    logLevel: isWatch ? 'info' : 'warn',
    define: {
      'process.env.NODE_ENV': JSON.stringify(isWatch ? 'development' : 'production')
    },
    plugins: [vue(), injectEmittedCss('media-preview-component-styles')],
    build: {
      target: 'es2020',
      outDir: 'dist',
      emptyOutDir: false,
      minify: isProduction,
      sourcemap: !isProduction,
      cssCodeSplit: false,
      lib: {
        entry: path.resolve('src/config/main.ts'),
        name: 'JellyfinMediaPreviewConfigBundle',
        formats: ['iife'],
        fileName: () => 'config.bundle.js'
      },
      rollupOptions: {
        output: {
          entryFileNames: 'config.bundle.js'
        },
        watch: isWatch ? {} : undefined
      }
    }
  });

if (isWatch) {
  await Promise.all([runtimeContext.watch(), configBuild()]);
} else {
  await Promise.all([runtimeContext.rebuild(), configBuild()]);
  await runtimeContext.dispose();

  const configBundle = await readFile(path.join('dist', 'config.bundle.js'), 'utf8');
  const trimmedConfigBundle = configBundle.trimEnd();
  if (!configBundle.includes('media-preview-component-styles') || !configBundle.includes('[data-v-')) {
    throw new Error('The production configuration bundle is missing compiled Vue component styles.');
  }
  if (!trimmedConfigBundle.startsWith('"use strict";') || !trimmedConfigBundle.endsWith('})();')) {
    throw new Error('The production configuration bundle failed embedded content boundary validation.');
  }

  await Promise.all([
    rm('dist/mediapreview.bundle.js.map', { force: true }),
    rm('dist/config.bundle.js.map', { force: true })
  ]);
}
