import { build } from 'esbuild';
import { resolve } from 'node:path';

// The device uses the upstream runtime. Resolve our shared characters to the
// same Three.js instance without changing the original workshop's runtime.
await build({
  entryPoints: ['dev/iphone-duo/main.js'], outfile: 'dev/iphone-duo/app.bundle.js',
  bundle: true, format: 'esm', minify: true,
  plugins: [{ name: 'duo-three', setup(builder) {
    builder.onResolve({ filter: /^(three|three\/addons\/.*)$|vendor\/three\.module\.js$/ }, args => ({
      path: resolve(args.path.startsWith('three/addons/')
        ? 'dev/iphone-duo/vendor/three/examples/jsm/' + args.path.slice('three/addons/'.length)
        : 'dev/iphone-duo/vendor/three/build/three.module.js'),
    }));
  } }],
});
