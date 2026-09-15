# Character-first, handcrafted worlds · 2026-09-06

Public entry: <https://jma.mikeywa.site/dev/>.
Runtime commit: `ccda97cd6b2f70271656bac31f1390b0e8dccde7`.
Tencent release: `/opt/kindergrimm/releases/20260906-dev-ccda97c`.

## Changes

- Camera framing uses actual character bounds, not the planet diameter. Real DOM title/dialogue regions become camera insets; changing answer mode and viewport size reframes the cast. The complete sphere is deliberately not required to fit onscreen.
- Eleven worlds have actual radii between 3.55 and 6, with individually selected day/dusk/night pastel atmospheres. Lighting keeps faces readable in night scenes.
- Dialogue sits directly above a gentle background fade. The default answer row contains the microphone and one disclosure control; text and choices appear on demand. The top menu contains the bag, camera reset and restart. Starting a story does not request the microphone.
- Original characters and objects have eight explicit surface classifications: paper, fabric, wood, stone, foliage, water, paint and ink. Stable volumetric pigment fields, antialiased fibres and shallow normal relief provide tactile detail without external texture images or a new render pass. Eyes and mouth details stay clean.
- All seven tracked model exports were regenerated with their material classifications. Character geometry and animation are unchanged. The film reference informs material direction only; no film model, frame, texture or character is reused.

## Local verification

- `verify-planet.mjs`: 2,156 mapped samples, 462 sphere rays, eleven sizes and atmospheres, all six reactions, reverse hemispheres, repeated updates and disposal pass. Actual river triangles retain positive clearance (bridge 0.007644, reef 0.004396, cove 0.008235 world units).
- `verify-storybook.mjs`: 13 Node contracts pass, including retained material/color references, 365 model meshes, 655,536 exact exported attribute values, eight surface branches, finite tuning, clean ink, shared ownership, disposal, and cached-program tuning after reapplication. This script does not itself compile GLSL.
- An independent WebGL fixture compiled and linked all eight surface branches with zero GL errors; its draw count remained eight and it allocated no textures. Final defaults are wash 0.22, grain 0.12, relief 0.38. Paper relief was reduced after actual near-view review to avoid pitted skin. On one Apple M4 / ANGLE Metal machine, the 1200×900 eight-material fixture was approximately 0.42–0.53 ms GPU time per frame after warmup. This is a limited fixture measurement, not mobile performance or a claim that enabling texture is faster.
- `verify-studio-local-results.json`: the final material bundle passes 43 actual-browser checks, including seven characters, eleven worlds, colors, size, expressions, actions, drag/reset, saved-character reload and mobile controls. A real model download retains the correct surface tags on all 59 meshes, and all 99,298 tested geometry values match the source exactly. Browser errors and shader console are empty.
- `verify-story-doudou-echo-moon-results.json` (01:57:48 UTC): all three stories complete their 18 scenes, mid-story continuation, memory save and completed-state reload. This run tested the new disclosure UI before the material-only refinement and the microphone guard fix. Narration was deliberately skipped; it is not a physical microphone or live-AI semantics test.
- `verify-immersive-ui-local-results.json`: 135 actual-browser views cover eleven worlds × three viewports × ready/question/choices/text, plus three fallback/short-height states. The cast remains in the measured safe area and its head/chest/feet are not covered by a DOM layer. Thirty-three synthetic previous-save checks remain byte-identical. Keyboard menu, dialog and disclosure checks pass. This full local matrix predates the material refinement but uses the same layout.
- `verify-immersive-ui-local-interactions-results.json`: additional real pointer checks verify drag/reset and that dismissing the menu does not click the character beneath it.
- `verify-immersive-ui-local-voice-guards-results.json`: four final-bundle cases cover onboarding/scene narration × menu/bag. Synthetic zero-valued MediaStreams and a one-second silent TTS timing fixture exercise the real AudioContext/AudioWorklet. Recording is enabled for a positive control, stays disabled after narration with the overlay open, resumes only on closing it, and explicit pause ends the track. No physical microphone is accessed; this does not validate speech quality or recognition. Both narration-completion paths now call the central listening guard.
- Asset, unchanged API-adapter, invention-continuity and ten voice lifecycle tests pass. Independent review found and verified the listening-guard correction above. A 390×500 view is a short-height keyboard proxy, not an actual iOS keyboard test.

The old `verify-planet-ui` reports retain their historical complete-globe framing requirement and are not used as acceptance evidence for this edition.

## Release isolation and live checks

The standard Git push timed out without moving the remote ref. The GitHub Git Data API then published the exact local tree and commit SHA using a non-force, parent-checked ref update; the remote SHA was read back and confirmed.

Deployment copied the previously active release, overlaid only `dev/` runtime resources (excluding `dev/tools/`), and switched the symlink atomically after fingerprint checks. No backend restart, data migration, DNS or Nginx change was performed. The previous release remains available for rollback.

All original non-`dev` files retain this aggregate SHA-256:

```text
7f28e5398c1e77065b3b47c447bdc4149e07b4a7cd5630c4e0dc6519183c79b0
```

All 28 public runtime/resource files return HTTP 200 and match their local SHA-256 values. `/dev` returns a 301 redirect to `/dev/`, the original homepage returns 200, health is OK, the service is active, and the warning journal is empty at release. Bundle SHA-256:

```text
e409c3e8008b00a2c0f9e0f84cd9abfe670442489470347f455b653d1737f318
```

### Production browser boundary

The complete production navigation matrix did **not** finish in a single run or across its bounded retries. The first attempt, second attempt and 360px batch each stopped on an automation navigation/reload timeout, not a layout assertion. Their failure reports are retained rather than overwritten with a passing result. A separate 390px meadow batch passed.

The combined evidence covers **96 of 135 unique views** and **23 of 33 previous-save checks**, including all eleven worlds at 1280×900 and 390×844, and two worlds at 360×800. Those observed views have no recorded layout/occlusion issue. The uncompleted 360px worlds and extra production fallback states must not be reported as verified; their corresponding local cases did pass earlier. The final report marks the production matrix incomplete.

Independent ordinary live openings, phone/desktop screenshots and twelve subsequent isolated reloads succeeded. During investigation, public index/bundle/Three.js GETs returned 200 in approximately 0.16/0.27/0.47 seconds; the server showed no matching static 5xx or error-log entry and the service remained healthy. Aborted TTS requests appear as 499 when the test deliberately skips speech. These checks do not establish the cause of the intermittent automation timeout or rule out all intermittent loading failures. No production or server change was made in response to an unconfirmed diagnosis.

Verification-only changes under `dev/tools/` do not change the deployed runtime.
