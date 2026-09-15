import { build } from 'esbuild';
await build({ entryPoints: ['dev/app.js'], bundle: true, format: 'esm', minify: true,
  plugins: [{ name: 'shared-three', setup(builder) {
    builder.onResolve({ filter: /vendor\/calligraph-bubble\.js/ }, () => ({ path: '../vendor/calligraph-bubble.js?v=20260910-lyric-motion', external: true }));
    builder.onResolve({ filter: /vendor\/three\.module\.js$/ }, () => ({ path: '../vendor/three.module.js', external: true }));
  } }], outfile: 'dev/app.bundle.js' });
console.log('Built the isolated /dev application.');
