import { build } from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

const result = await build({
  entryPoints: [path.join(root, 'src/main.js')],
  bundle: true,
  minify: true,
  format: 'iife',
  target: ['es2020'],
  legalComments: 'none',
  write: false,
  logLevel: 'info'
});

const js = result.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const css = fs.readFileSync(path.join(root, 'src/style.css'), 'utf8');
const tpl = fs.readFileSync(path.join(root, 'src/template.html'), 'utf8');

const html = tpl
  .replace('/*__CSS__*/', () => css)
  .replace('//__JS__', () => js);

const out = path.join(root, 'index.html');
fs.writeFileSync(out, html, 'utf8');
console.log(`\n✔ index.html  ${(Buffer.byteLength(html) / 1024).toFixed(0)} KB`);
