import { buildSync } from 'esbuild';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { statSync } from 'node:fs';

const root = path.dirname(fileURLToPath(import.meta.url));
const outfile = path.join(root, 'api', 'index.js');

const result = buildSync({
  entryPoints: [path.join(root, 'api', 'index.ts')],
  outfile,
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'node20',
  sourcemap: false,
  minify: true,
  treeShaking: true,
  define: {
    'process.env.NODE_ENV': '"production"',
    'import.meta.url': '"file:///var/task/api/index.js"',
  },
  logLevel: 'warning',
});

const inputs = result.metafile ? Object.keys(result.metafile.inputs).length : 0;
console.log(`bundled ${inputs} inputs -> api/index.js (${Math.round(statSync(outfile).size / 1024)} KiB)`);