# Landing artwork, September 2026

`story-wow`, `story-debate`, and `story-moon` are screenshots of the actual playable 3D story pages. `tools/capture-story-covers.mjs` advances the first chapter until Gugu appears and hides only the interface while capturing the scene. `hero-immersive` is a static fallback captured from the homepage renderer.

`child-avatars` is an AI-generated six-avatar atlas, arranged in three columns and two rows: astronaut kitten, crowned dinosaur, strawberry rabbit, cloud with goggles, superhero chick, sailor octopus. It is used as fictional default profile artwork, not portraits of real children.

`hero`, `candy`, `chapter-*`, and `concept-*` are earlier procedural concept renders from `src/landing-art-scene.js`, reusing `/dev/models.js`. They are not gameplay captures. The three journey examples use fictional aliases and authored sample text.

`history-story`, `history-lab`, `studio`, `friends`, `yellow-four`, and `iphone-duo` are actual local product screenshots captured by `tools/capture-landing.mjs`. Existing product and third-party notices continue to apply.

All images are local WebP. Start the project server before capturing; set `PLAYWRIGHT_MODULE` and `SHARP_MODULE` to the available runtime paths. `tools/landing-art.html` is the deterministic concept capture surface.
