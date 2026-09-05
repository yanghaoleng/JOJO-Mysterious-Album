# Illustrated miniature planets · 2026-09-06

Public entry: <https://jma.mikeywa.site/dev/>.
Product commits: `469cf9e48b5d85f9a0613187edaad3678195ce83` and water-ribbon refinement `e101cdd719bede52f8daeee697f8a1f0ab469109`.
Tencent release: `/opt/kindergrimm/releases/20260906-dev-e101cdd`.

## Changes and local evidence

- Eleven complete, closed spheres replace the small disk bases. Static geometry is curved once; moving landmarks and character roots follow their local radial up direction. Each reverse hemisphere has 14 themed terrain anchors. No floor remains beneath the planet.
- `verify-planet.mjs`: 196 mapped surface/normal samples, 42 spherical ray samples per world, all six reactions, repeated update/dispose and no per-frame geometry allocation pass.
- The wide underwater ribbon was additionally divided into four cross-river segments, retaining 112 longitudinal segments and its original 0.014 surface offset. Minimum triangle clearance is 0.006917 for reef and 0.009471 for bridge/cove; the ribbon no longer disappears into the planet.
- `storybook.js`: original material/color references are retained; soft light bands, low specular response, stable local-space paper grain and edge pigment add no render pass. `verify-storybook.mjs` passes 10 Node contracts, 365 model meshes and 655,536 exported attribute values. This test does not itself perform WebGL compilation.
- `verify-studio-local-results.json`: actual browser controls cover seven characters, five colors, 75–125% size, four expressions, six actions and eleven worlds. A real download compared 99,298 attribute values to the source with maximum difference 0. Desktop/mobile controls and saved-character restoration pass.
- `verify-story-doudou-echo-moon-results.json`: all three local story paths complete all 18 scenes, mid-story refresh/continue, memory saving and completed-state reload. Dialogue is deliberately skipped; this is not a new physical-microphone test.
- `verify-planet-ui-local-results.json`: 51 views across 1280×900, 390×844 and 360×800, including all eleven default worlds; 15 positive/negative occlusion checks; nine synthetic prior-save reload checks with byte-identical storage. All pass without clipping, overflow or browser/shader errors. This local matrix preceded only the water-ribbon subdivision refinement.
- Real Chromium touch dispatch at 390×844 verified two-finger expansion/contraction: zoom 1 → 1.6444 → 0.7016 without unintended yaw/pitch changes, followed by the visible reset control. This is mobile emulation, not a claim of physical-device testing.
- Existing asset, API-adapter, invention-continuity and ten voice lifecycle checks pass. The story definitions, application flow, voice code and backend adapter are unchanged.

## Release isolation and online verification

Both product commits were pushed normally to GitHub `main` and their exact remote SHA values verified. Deployment copied the previous active release, overlaid only `dev/` runtime resources (not `dev/tools/`), and switched the static symlink atomically. No backend restart, DNS or Nginx change was needed.

All original non-`dev` files retained the aggregate SHA-256 digest:

```text
7f28e5398c1e77065b3b47c447bdc4149e07b4a7cd5630c4e0dc6519183c79b0
```

All 26 public runtime/resource files returned HTTP 200 and matched their local SHA-256 values. `/dev` redirects to `/dev/` with 301; the original homepage returns 200; health is OK, `kindergrimm.service` remains active and its warning journal is empty. Final application bundle SHA-256:

```text
50c8575b2d5142ea61ab2d349660834afba13aa8d15f61e644e41668ef4494d8
```

`verify-planet-ui-production-results.json` verifies the final release, including the water-ribbon refinement: 51 views, 15 front-hit/back-occluded pointer checks, nine byte-identical prior-save checks, zero clipping/overflow issues and empty browser/shader error logs. The underwater front/reverse screenshots were also inspected directly; the water ribbon is continuous. The independent QA browser was closed afterward and never requested a microphone.

The previous `/opt/kindergrimm/releases/20260905-dev-291a9a1` is retained for rollback. These changes neither migrate nor clear old storage. Verification-only commits under `dev/tools/` do not change the deployed runtime.
