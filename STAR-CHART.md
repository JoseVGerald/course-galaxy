# Star Chart reconstruction

Run `npm install`, then `npm run dev`. The development preview is at http://127.0.0.1:5173/.

`npm run build` checks TypeScript and builds the static site. `node scripts/verify-chart.mjs` verifies protected navigation, camera mappings, overview restoration, and route endpoints.

The top and bottom navigation bars and the original stylesheet are preserved. Refinements are scoped to `src/chart-refinements.css`.

- `src/environment.ts`: independently rendered nebula, cloud filaments, depth layers and seeded star field. No screenshot, video or character layer.
- `src/orbits.tsx`: vector orbit circles, calibrated tick marks and radial system connections.
- `src/markers.tsx`: live vector mission diamonds, special markers, junctions and locks.
- `src/paths.ts`: individually traced cubic controls for the supplied Mercury, Venus, Earth, Jupiter and Europa images; other routes use projected spherical curves.
- `src/engine.ts`: planet rendering and one shared camera transform for planet bodies and navigation geometry.
- `src/planet-materials.ts`: image-free GPU materials for terrain, craters, fractures, landmasses, weather bands, atmospheric scattering, cloud shells and planetary rings.
- `src/reference-layouts.json`: reference-derived node coordinates and documented mission metadata. Text is rendered live, without label crops.

Click a planet, use the wheel to zoom toward the pointer, drag to pan, and use Zoom Out to return to the system framing. `+` / `-` adjust scale; `Home` or right click returns; `H` shows controls.

## Sources and fidelity

The supplied 1920 × 1080 recording and stills establish the composition, proportions, node locations and traced route handles. The rendered background and SVG graphics are new implementations; exact original shader behavior has not been recovered. Pixel equivalence and matching every animation to a recorded frame have not been established.

Planets, their cloud and atmosphere shells, rings, the nebula, star field and Void light are rendered in Three.js without image textures. Their detail is generated from deterministic three-dimensional fields and hand-authored geographic outlines. The preserved navigation icon assets belong to Digital Extremes. Mission metadata and additional positional references come from the [WARFRAME Wiki](https://wiki.warframe.com/w/Star_Chart).

The chart typeface is Flareserif 821 BT Roman, Bitstream Inc.; the locally served WOFF was obtained from the [font specimen and distribution page](https://www.wfonts.com/font/flareserif821-bt). The [WARFRAME font reference](https://wiki.warframe.com/w/Fonts) identifies its use in the game. The existing navigation font is unchanged.
