# Future Plans

A living document for features we want to build but aren't prioritising right now.

---

## 1. Infinite Horizontal Map Wrapping

**Status:** Planned  
**Priority:** Medium  
**Affects:** `MapCanvas.jsx`

### What
The world map should tile seamlessly when panning left or right. Currently, Russia's far-east (Chukotka peninsula, ~170°W) appears as a disconnected sliver on the left edge of the map because the projection cuts at the ±180° boundary. Panning left hits empty space instead of the map re-appearing from the other side.

### How (implementation plan)

**Render 3 SVG copies:**  
Instead of one `<g>` group, render three — left, center, right — each containing identical map paths but horizontally offset by one "world width" (`MW` SVG units).

**Compute `MW` from the projection:**
```js
const [leftX]  = projection([-180, 0]);
const [rightX] = projection([ 180, 0]);
const MW = rightX - leftX; // pixel width of one world copy in SVG coords
```
Store in a `mapWidthRef` ref so the zoom handler can read it.

**Intercept the D3 zoom handler — apply modulo to x translation:**
```js
const period = transform.k * MW;
const nx = ((transform.x % period) + period) % period;

gLeft.attr('transform',   `translate(${nx - period}, ${transform.y}) scale(${transform.k})`);
gCenter.attr('transform', `translate(${nx},          ${transform.y}) scale(${transform.k})`);
gRight.attr('transform',  `translate(${nx + period}, ${transform.y}) scale(${transform.k})`);
```
This keeps the three copies always covering the viewport with no visible snap/jump.

**Labels:** only render in the center group to avoid tripling label count.

**Click events:** work for free — all three groups share the same feature data, so clicking any copy correctly identifies the country.

**Limit scope:**
- Only active when `projectionType === 'equirectangular' || 'mercator'`
- Only at `level === 'world'` (country/state drill-downs don't tile)
- Orthographic (globe) and Albers are excluded — they don't have linear horizontal periodicity

### Complexity estimate
~60–80 lines of changes in `MapCanvas.jsx`. Medium effort, no data or API changes needed.

### Known edge cases to handle
- Zoom reset should reset to normalized tx (not raw tx that might be >period)
- SVG export: only export the center copy, strip the left/right groups
- `fitSize` padding means `MW` is slightly less than viewport width — must use computed value, not just `width`

---

<!-- Add future plans below this line -->
