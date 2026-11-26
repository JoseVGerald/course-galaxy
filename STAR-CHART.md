# Star Chart reconstruction

Run `npm install`, then `npm run dev`. The development preview is at http://127.0.0.1:5173/.

`npm run build` checks TypeScript and builds the static site. `node scripts/verify-chart.mjs` verifies protected navigation, camera mappings, overview restoration, and route endpoints.

The top and bottom navigation bars and the original stylesheet are preserved. Refinements are scoped to `src/chart-refinements.css`.

- `src/environment.ts`: independently rendered nebula, cloud filaments, depth layers and seeded star field. No screenshot, video or character layer.
- `src/orbits.tsx`: vector orbit circles, calibrated tick marks and radial system connections.
- `src/markers.tsx`: live vector mission diamonds, special markers, junctions and locks.
- `src/paths.ts`: individually traced cubic controls for the supplied Mercury, Venus, Earth, Jupiter and Europa images; other routes use projected spherical curves.
- `src/engine.ts`: planet rendering and one shared camera transform for planet bodies and navigation geometry.
- `src/planet-materials.ts`: GPU materials that wrap the baked Blender maps (colour, normal, night lights, glint), plus Blender-coloured atmosphere glow, cloud shells and ring strips.
- `src/blender-planets.ts`: maps each chart body to a Blender planet type (`blenderTypeFor`) and loads its textures from `web/assets/planets`, so re-baking in Blender updates the chart. Normal/night-light maps load once a planet is large on screen, and the 4K colour map when its map opens.
- `src/planet-hud.tsx`, `src/planet-hud.css`, `src/hud-content.ts`: the mission HUD that opens when a planet is clicked (orbit ring, compass markers, waypoint coordinates, leader line, MISSION / ROUTES / SUPPLIES panels, START MISSION). Briefs and progress are authored demo data in `hud-content.ts`.
- `src/reference-layouts.json`: reference-derived node coordinates and documented mission metadata. Text is rendered live, without label crops.

Click a planet to open its mission screen. Hold and drag the open planet to spin it, left or right (a quick click on its right or left half nudges it, and a spun planet keeps coasting). The wheel zooms about the planet while it is open (up to a limit that keeps it whole on screen); scroll out a little to see more around it, or scroll out further, or once hard, to return to the chart. Drag the background to pan, and use Zoom Out to return to the system framing. `+` / `-` adjust scale; `Home` or right click returns; `H` shows controls. The orbit lines and circles are generated to fill the visible field, however far the view is panned or zoomed out.

## Sources and fidelity

The supplied 1920 × 1080 recording and stills establish the composition, proportions, node locations and traced route handles. The rendered background and SVG graphics are new implementations; exact original shader behavior has not been recovered. Pixel equivalence and matching every animation to a recorded frame have not been established.

Planets use the Blender-baked maps from `web/assets/planets`, shaded and lit live in Three.js. The nebula, star field and Void light are still generated on the GPU without image textures. The preserved navigation icon assets belong to Digital Extremes. Mission metadata and additional positional references come from the [WARFRAME Wiki](https://wiki.warframe.com/w/Star_Chart).

The chart typeface is Flareserif 821 BT Roman, Bitstream Inc.; the locally served WOFF was obtained from the [font specimen and distribution page](https://www.wfonts.com/font/flareserif821-bt). The [WARFRAME font reference](https://wiki.warframe.com/w/Fonts) identifies its use in the game. The existing navigation font is unchanged.
