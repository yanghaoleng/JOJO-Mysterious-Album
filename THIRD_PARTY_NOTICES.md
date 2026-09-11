# Third-Party Notices

JOJO Mysterious Album includes or builds on the following separately licensed
materials. Their original licenses continue to apply and are not replaced by
the project-level noncommercial license.

## Kindergrimm

- Source: <https://github.com/albertobeiz/kindergrimm>
- License: The Unlicense
- Full text: `licenses/KINDERGRIMM-UNLICENSE`
- Scope: the original procedural character, rendering, animation, demo, and
  related source and assets inherited from the upstream project.

## Three.js r160

- Source: <https://threejs.org/>
- License: MIT
- Copyright 2010-2023 Three.js Authors
- Scope: `vendor/three.module.js`
- Full text: `licenses/MIT`

## Calligraph 1.4.1

- Source: <https://calligraph.raphaelsalaja.com/>
- License: MIT
- Copyright 2026 Raphael Salaja
- Scope: `vendor/calligraph-bubble.js` and its source dependency.
- Full text: `licenses/MIT`

## UISFX 0.4.0

- Source: <https://uisfx.com/>
- Code license: MIT
- Audio asset license: CC0 1.0 Universal
- Copyright 2026 Yuki Capital for the runtime code
- Scope: `vendor/uisfx.js` and the `uisfx` development dependency. The current
  site synthesizes the Organic pack locally with Web Audio and does not fetch
  sound files at runtime.
- Full texts: `licenses/MIT` and `licenses/UISFX-CC0`

Redistribution must preserve these notices and the corresponding full license
texts.

## iPhone Duo view

The isolated `/dev/iphone-duo/` view adapts the folding model, screen projection, and asset preparation code from [chuspeeism/iphone-duo](https://github.com/chuspeeism/iphone-duo), commit `2662ebbeb6aa844cd4f6888f7d6f8958662249fd`, originally copyright (c) 2026 jadon7, under the MIT License. The complete license is retained at `dev/iphone-duo/licenses/IPHONE-DUO-MIT`. Our changes add two live character scenes, Chinese controls, a closed initial state, and responsive framing.

The isolated runtime includes upstream Three.js 0.186.0 (MIT, `dev/iphone-duo/vendor/three/LICENSE`) and fflate 0.8.2 (copyright (c) 2020 Arjun Barrett, MIT, `dev/iphone-duo/vendor/three/examples/jsm/libs/fflate.LICENSE`). The original workshop's separate Three.js runtime is unchanged.

The phone model and textures are derived from Apple's [iPhone Duo Star White USDZ](https://www.apple.com/105/media/us/iphone-duo/2026/9305e4b9-72d9-4c05-9381-b572adadd5e5/ar/iPhone_Duo_e-sim_Star-White_Variant.usdz), using the upstream asset preparation procedure. These Apple assets and trademarks belong to Apple and are **not covered by the repository's MIT license**. See the retained upstream notes at `dev/iphone-duo/licenses/UPSTREAM-NOTICES.md`. The screen content in this view uses this project's character models instead of Apple wallpapers, clock overlays, or launcher screenshots.
