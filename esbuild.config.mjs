import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const config = {
  entryPoints: [resolve(__dirname, 'server/index.ts')],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outdir: resolve(__dirname, 'dist'),
  packages: 'external',
  target: 'node20',
  sourcemap: true,
  minify: process.env.NODE_ENV === 'production',
  logLevel: 'info',
};

export default config;

