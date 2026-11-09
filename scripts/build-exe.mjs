import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';
import postject from 'postject';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const outDir = path.join(root, 'dist');
fs.mkdirSync(outDir, { recursive: true });

const bundlePath = path.join(outDir, 'bundle.cjs');
await esbuild.build({
  entryPoints: [path.join(root, 'src/cli/search.js')],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  outfile: bundlePath,
});

const seaConfigPath = path.join(outDir, 'sea-config.json');
const blobPath = path.join(outDir, 'sea-prep.blob');
fs.writeFileSync(
  seaConfigPath,
  JSON.stringify({ main: bundlePath, output: blobPath, disableExperimentalSEAWarning: true }, null, 2)
);
execFileSync(process.execPath, ['--experimental-sea-config', seaConfigPath], { stdio: 'inherit' });

const exeName = process.platform === 'win32' ? 'stremio-lookalike.exe' : 'stremio-lookalike';
const exePath = path.join(outDir, exeName);
fs.copyFileSync(process.execPath, exePath);

await postject.inject(exePath, 'NODE_SEA_BLOB', fs.readFileSync(blobPath), {
  sentinelFuse: 'NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2',
});

console.log(`Built ${exePath}`);
console.log('On Windows: double-click it, or run `stremio-lookalike.exe "dark knight"` in a terminal.');
