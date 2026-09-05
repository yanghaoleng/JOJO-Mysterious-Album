# /dev production verification · 2026-09-05

Product commit: `291a9a1078b9b856fe86bcb26544874ff2083af9`.
Active Tencent release: `/opt/kindergrimm/releases/20260905-dev-291a9a1`.
Public entry: <https://jma.mikeywa.site/dev/> (`/dev` redirects to `/dev/`).

The feature was based on verified latest GitHub `main`, `09a87350e61bec2b3a71442682a3431d20b5ab9e`. GitHub received the exact locally verified product commit and tree using a non-force update. Subsequent verification-only commits do not change the deployed runtime.

## Requirement evidence

| Requirement | Evidence |
| --- | --- |
| Three independently rebuilt story lines | `stories.js`: 3 stories, 3 chapters each, 18 scenes, 36 valid alternatives; all three production paths completed in `verify-story-*-results.json`. |
| New non-skeletal models | `models.js`, 7 actual exported assets; `verify-assets.mjs` checks zero Bone/SkinnedMesh/skin weights, finite geometry/actions, source-to-export vertex/normal/UV/topology equality. |
| Rich new dioramas | `worlds.js`: 11 worlds, all used across the 18 scenes; resource disposal and action feedback checked. |
| Independent character simulator | `verify-studio-production-results.json`: 7 characters, 5 colors, size, 4 expressions, 6 actions, 11 scenes, camera control, saving/restoring, real download and mobile/desktop interaction. |
| Correct exported geometry | Fresh production download: 59 meshes, 20,254 triangles; 99,298 vertex attributes compared to the factory, maximum difference 0; indices and creator/recipe preserved. |
| Voice-first interaction | `verify-real-voice-results.json`: production AudioWorklet → VAD → PCM16 → ASR 200 (volc) → recognized recorded phrase → two TTS 200 responses → next question and resumed listening. Pause/resume/exit release verified. |
| Free invention continuity | Production moon requests returned 200; original rocket persisted with navigation, floats, paddles, ladder, rope and thrusters. Pure invention tests also cover explicit replacement. |
| Original app remains untouched | Release is a copy of the existing production tree plus `dev/`; all original file SHA-256 values match. Aggregate original-file digest: `7f28e5398c1e77065b3b47c447bdc4149e07b4a7cd5630c4e0dc6519183c79b0`. No root-page, backend, Nginx or old storage changes. |
| Deployment is real | 24 public runtime/resource files returned 200 and matched local SHA-256 values; canonical redirect passed; service active, health OK, warning journal empty. |

The old `/opt/kindergrimm/releases/20260902-77ca208` remains available for rollback. The Python service was not restarted: its unchanged stateless APIs remained available while Nginx switched static content atomically. Persistent analytics data remained outside both releases.

## Boundaries

- Browser story traversal deliberately skips most spoken lines; separate recorded-input voice verification covers actual playback and recognition.
- All voice integration fixtures are synthetic prerecorded phrases. No physical microphone was accessed. Phone-speaker echo and every possible free-form utterance are not claimed as exhaustively tested.
- The simulator export is a real static mesh plus editing recipe; runtime animation code is delivered separately in `models.js`.
- `dev/tools/` contains development/verification helpers and is deliberately excluded from the production archive.
