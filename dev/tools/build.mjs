import { build } from 'esbuild';
await build({ entryPoints: ['dev/app.js'], bundle: true, format: 'esm', minify: true, external: ['../vendor/three.module.js'], outfile: 'dev/app.bundle.js' });
console.log('Built the isolated /dev application.');
