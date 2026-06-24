# Changelog

All notable changes to **SnapMap** are documented here.

---

## [1.0.0-release] — 2026-06-24

### Brand Identity, Documentation & Deployments

- **Rebranded to SnapMap**: Unified brand identity across configuration, README, future planning, and changelogs.
- **Vite Base Configuration**: Added dynamic base path in `vite.config.js` (`process.env.NODE_ENV === 'production' ? '/SnapMap/' : '/'`) to ensure static assets compile correctly for subpath hosting under GitHub Pages.
- **GitHub Actions Deployment**: Built automated pipeline `.github/workflows/deploy.yml` that checks out repository, configures Node.js, installs dependencies, builds static bundle, and deploys to GitHub Pages on pushes to `main`.
- **Favicon Redesign**: Replaced the default React favicon in `public/favicon.svg` with a polished, modern map-marker icon from Iconify.
- **Technical Documentation**:
  - Created `README.md` containing features list, live link, local startup scripts, and deployment instructions.
  - Created `ARCHITECTURE.md` explaining state orchestrations, centroid mappings, Visvalingam simplification math, bounding box pruning, Shoelace winding order corrections, and font sizing math.
- **Future Feature Plans**: Documented upcoming interactive clipboard copy pipeline for raw SVG XML and canvas-derived 2x PNG data in `FUTUREPLAN.md`.

## [Unreleased] — 2026-06-21 (update 2)

### Sliders — Responsiveness & Visual Polish

- **Track fill**: every range slider now renders a gold-filled track up to the current thumb position using an inline `linear-gradient`, so the value is visually obvious at a glance.
- **Thumb redesign**: thumb enlarged to 13 px, added a subtle dark border and stronger glow on hover/active. `:active` state expands the thumb to give tactile feedback while dragging.
- **Added Firefox slider styles** (`-moz-range-thumb`, `-moz-range-track`) for cross-browser consistency.
- **Simplification slider — commit-on-release**: a local `localSimplify` state in the Sidebar updates the displayed percentage on every `onChange` tick (instant UI feedback), but the expensive `simplifyGeoJSON` computation is only triggered `onPointerUp` when the user releases the slider. Keeps the UI smooth even at high feature counts.

### Simplification — Method Options

- **Removed Douglas-Peucker** from the Method dropdown — it produced distorted/broken borders in practice.
- **Added Visvalingam (spherical)** (new default): uses a latitude-corrected triangle area (`cos(lat)` scaling) so polar regions are not over-simplified relative to equatorial regions. Lives in `simplifyVisvalingamSpherical` in `geoUtils.js`.
- **Renamed old Visvalingam to Visvalingam (planar)**: treats lon/lat as flat 2-D, retained as an option.
- Both variants share the same internal `_vwRun` runner — only the area function differs.
- `simplifyGeometry` / `simplifyGeoJSON` default changed to `'visvalingam-spherical'`.
- `App.jsx` default and reset both updated to `'visvalingam-spherical'`.

---

## [Unreleased] — 2026-06-21 (update 1)

### UI Redesign — Complete sidebar overhaul

- **Replaced tab-based sidebar with collapsible accordion sections** matching the amCharts SVG Map Generator reference UI. Sections: MAP & PROJECTION, COLORS, SIMPLIFICATION, FILL TOOL, LABELS, POLYGONS.
- **Reduced sidebar width** from 380 px to 240 px for a more compact, professional layout.
- **Color controls redesigned**: each color now uses a compact 18 × 18 px swatch that opens the native color picker on click. Visibility toggles for Water and Graticule appear inline on the same row.
- **Added B&W preset button** in the COLORS section header — one click applies a black-and-white map palette.
- **Export buttons moved to a fixed footer** at the bottom of the sidebar (SVG / PNG / Reset), always visible regardless of scroll position.
- **Polygon list improvements**: added All / None visibility buttons, A–Z ▲ / Z–A ▼ sort toggle, and a count badge showing the number of visible features.
- **Floating zoom controls simplified** to ⌂ / + / − with a minimal dark pill style, matching the reference UI.
- **Breadcrumb bar** height reduced to 30 px with subtler styling.
- **Error banner** refactored from inline styles to a dedicated `.error-banner` CSS class.
- **Removed** now-unused `sidebarTab` / `setSidebarTab` state from `App.jsx`.

### Simplification System — Rewrite

- **Added Visvalingam-Whyatt algorithm** (`simplifyVisvalingam` in `geoUtils.js`) — area-based, monotonic-constraint simplification. Produces smoother, more natural border curves than Douglas-Peucker, especially at high reduction levels.
- **Added Method selector** in the SIMPLIFICATION section: choose between *Visvalingam* (default) and *Douglas-Peucker*.
- **Reworked tolerance mapping per algorithm**:
  - Visvalingam: `tolerance = (amount/100)^1.5 × 0.008` (square-degrees, area threshold)
  - Douglas-Peucker: `tolerance = 0.0001 + (amount/100) × 0.0599` (degrees, distance threshold)
- **`simplifyGeometry` and `simplifyGeoJSON`** updated to accept a `method` parameter (`'visvalingam'` | `'dp'`), defaulting to `'dp'` for backwards compatibility.
- `simplificationMethod` state added to `App.jsx` and included in `handleResetSettings`.

### Bug Fixes

- **Fixed country dropdown drill-down**: `handleCountrySelect` was passing a synthetic feature without `shapeGroup` (ISO3), causing `handleCountryClick` to bail out early. Added `shapeGroup: iso3` to the synthetic feature so dropdown-selected countries correctly load ADM1 boundaries.

### CSS / Design System

- **Complete rewrite of `src/index.css`**: new design token set (`--sb-bg`, `--sec-hdr-bg`, `--input-bg`, `--txt-label`, etc.), compact row grid system (`.ctrl-row` / `.ctrl-lbl` / `.ctrl-val`), new swatch component styles, refined slider thumbs, new icon-button and small-button styles.
- **Added Space Grotesk** to the Google Fonts import; available as a label font option.
- **`src/App.css`**: leftover Vite boilerplate, not used by the app — left untouched.

### Code Quality

- Removed unused Lucide imports (`Globe`, `Map`, `Compass`, `RotateCcw`) from `App.jsx`.
- Removed unused Lucide imports (`ZoomIn`, `ZoomOut`, `Maximize2`, `HelpCircle`) from `MapCanvas.jsx`.
