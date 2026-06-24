import React, { useState, useEffect } from 'react';
import { Paintbrush, Trash2, Eye, EyeOff, Download, RotateCcw } from 'lucide-react';

function Sidebar({
  level,
  selectedCountry,
  selectedState,
  activeGeoJSON,
  searchQuery,
  setSearchQuery,

  countryList,
  statesList,
  onCountrySelect,
  onStateSelect,

  mapViewType,
  setMapViewType,
  regionFilter,
  setRegionFilter,
  navigateToWorld,

  projectionType,
  setProjectionType,
  fillColor,
  setFillColor,
  strokeColor,
  setStrokeColor,
  strokeWidth,
  setStrokeWidth,
  bgColor,
  setBgColor,
  waterColor,
  setWaterColor,
  graticuleColor,
  setGraticuleColor,
  showWater,
  setShowWater,
  showGraticule,
  setShowGraticule,
  graticuleStep,
  setGraticuleStep,

  simplificationAmount,
  setSimplificationAmount,
  simplificationMethod,
  setSimplificationMethod,

  showLabels,
  setShowLabels,
  labelColor,
  setLabelColor,
  labelSize,
  setLabelSize,
  labelFont,
  setLabelFont,
  fitLabels,
  setFitLabels,

  fillOverrides,
  setFillOverrides,
  visibilityOverrides,
  setVisibilityOverrides,
  fillToolActive,
  setFillToolActive,
  fillToolColor,
  setFillToolColor,

  onReset,
  onResetOverrides,
}) {
  const [open, setOpen] = useState({
    map: true, colors: true, simplify: true,
    fill: true, labels: true, polygons: true,
  });
  const [sortAZ, setSortAZ] = useState(true);

  // Local state for simplification slider — show value immediately,
  // but only run the expensive computation on pointer release
  const [localSimplify, setLocalSimplify] = useState(simplificationAmount);
  useEffect(() => { setLocalSimplify(simplificationAmount); }, [simplificationAmount]);

  const toggle = (k) => setOpen(p => ({ ...p, [k]: !p[k] }));

  // ── Export ─────────────────────────────────────────────
  const handleExportSVG = () => {
    const svgEl = document.getElementById('map-svg');
    if (!svgEl) return;
    const clone = svgEl.cloneNode(true);
    clone.setAttribute('width', '100%');
    clone.setAttribute('height', '100%');
    const svgStr = new XMLSerializer().serializeToString(clone);
    const blob = new Blob(
      [`<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n`, svgStr],
      { type: 'image/svg+xml;charset=utf-8' }
    );
    const url = URL.createObjectURL(blob);
    const label = selectedCountry
      ? selectedCountry.name.toLowerCase().replace(/\s+/g, '-')
      : 'world';
    const a = document.createElement('a');
    a.href = url; a.download = `map-${label}.svg`;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  const handleExportPNG = () => {
    const svgEl = document.getElementById('map-svg');
    if (!svgEl) return;
    const svgStr = new XMLSerializer().serializeToString(svgEl.cloneNode(true));
    const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const { width, height } = svgEl.getBoundingClientRect();
      const canvas = document.createElement('canvas');
      const scale = 2;
      canvas.width = width * scale;
      canvas.height = height * scale;
      const ctx = canvas.getContext('2d');
      ctx.scale(scale, scale);
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob((b) => {
        const pngUrl = URL.createObjectURL(b);
        const label = selectedCountry
          ? selectedCountry.name.toLowerCase().replace(/\s+/g, '-')
          : 'world';
        const a = document.createElement('a');
        a.href = pngUrl; a.download = `map-${label}.png`;
        document.body.appendChild(a); a.click();
        document.body.removeChild(a); URL.revokeObjectURL(pngUrl);
      }, 'image/png');
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  // ── Polygon helpers ────────────────────────────────────
  const showAll = () => setVisibilityOverrides({});
  const hideAll = () => {
    const ov = {};
    (activeGeoJSON?.features || []).forEach(f => {
      const k = f.properties.shapeID || f.properties.shapeName;
      if (k) ov[k] = false;
    });
    setVisibilityOverrides(ov);
  };

  const shapes = (activeGeoJSON?.features || [])
    .filter(f => (f.properties.shapeName || '').toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      const na = a.properties.shapeName || '';
      const nb = b.properties.shapeName || '';
      return sortAZ ? na.localeCompare(nb) : nb.localeCompare(na);
    });

  // ── B&W preset ─────────────────────────────────────────
  const applyBW = () => {
    setFillColor('#aaaaaa');
    setStrokeColor('#333333');
    setBgColor('#0d0d0d');
    setWaterColor('#111111');
    setGraticuleColor('#2a2a2a');
  };

  // ── Track-fill helper — produces a gold-filled slider track ────────────
  const tf = (val, min, max) => {
    const pct = ((val - min) / (max - min)) * 100;
    return {
      background: `linear-gradient(to right, var(--accent) ${pct}%, rgba(255,255,255,0.10) ${pct}%)`
    };
  };

  // ── Sub-components ─────────────────────────────────────
  const Hdr = ({ id, label, right }) => (
    <button className="sec-hdr" onClick={() => toggle(id)}>
      <span className="sec-hdr-left">
        <span>{open[id] ? '▾' : '▸'}</span>
        <span>{label}</span>
      </span>
      {right && <span className="sec-hdr-right" onClick={e => e.stopPropagation()}>{right}</span>}
    </button>
  );

  const Row = ({ label, children }) => (
    <div className="ctrl-row">
      <span className="ctrl-lbl">{label}</span>
      <div className="ctrl-val">{children}</div>
    </div>
  );

  const Swatch = ({ value, onChange, large }) => (
    <label className="swatch-btn">
      <span
        className="swatch"
        style={{
          background: value,
          width: large ? 26 : 18,
          height: large ? 26 : 18,
          borderRadius: large ? 4 : 3,
        }}
      />
      <input type="color" value={value} onChange={e => onChange(e.target.value)} />
    </label>
  );

  return (
    <div className="sidebar">
      {/* ── Brand ── */}
      <div className="sb-logo">
        <span>MapForge SVG</span>
      </div>

      {/* ── Scrollable content ── */}
      <div className="sb-scroll">

        {/* ════ MAP & PROJECTION ════ */}
        <Hdr id="map" label="MAP & PROJECTION" />
        {open.map && (
          <div className="sec-body">
            <Row label="Map">
              <select value={selectedCountry?.iso3 || ''} onChange={e => onCountrySelect(e.target.value)}>
                <option value="">World</option>
                {countryList.map(c => <option key={c.iso3} value={c.iso3}>{c.name}</option>)}
              </select>
            </Row>

            {(level === 'country' || level === 'state') && statesList.length > 0 && (
              <Row label="State">
                <select value={selectedState?.name || ''} onChange={e => onStateSelect(e.target.value)}>
                  <option value="">Whole</option>
                  {statesList.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </Row>
            )}

            <Row label="View">
              <select value={mapViewType} onChange={e => { setMapViewType(e.target.value); navigateToWorld(); }}>
                <optgroup label="World">
                  <option value="worldLow">World Low</option>
                  <option value="worldHigh">World High</option>
                  <option value="worldUltra">World Ultra</option>
                  <option value="worldOutlineLow">Outline Low</option>
                  <option value="worldOutlineHigh">Outline High</option>
                </optgroup>
                <optgroup label="Contested Views">
                  <option value="worldIndiaLow">India View Low</option>
                  <option value="worldIndiaHigh">India View High</option>
                  <option value="worldChinaLow">China View Low</option>
                  <option value="worldChinaHigh">China View High</option>
                  <option value="worldRussiaLow">Russia View Low</option>
                  <option value="worldMoroccoLow">Morocco View Low</option>
                </optgroup>
                <optgroup label="Continents">
                  <option value="continentsLow">Continents Low</option>
                  <option value="continentsHigh">Continents High</option>
                </optgroup>
                <optgroup label="Regional">
                  <option value="region/world/asiaLow">Asia</option>
                  <option value="region/world/europeLow">Europe</option>
                  <option value="region/world/middleEastLow">Middle East</option>
                  <option value="region/world/africaLow">Africa</option>
                  <option value="region/world/latinAmericaLow">Latin America</option>
                </optgroup>
              </select>
            </Row>

            <Row label="Proj">
              <select value={projectionType} onChange={e => setProjectionType(e.target.value)}>
                <option value="equirectangular">Equirectangular</option>
                <option value="mercator">Mercator</option>
                <option value="orthographic">Orthographic</option>
                <option value="albers">Albers Equal Area</option>
              </select>
            </Row>

            {level === 'world' && (
              <Row label="Region">
                <select value={regionFilter} onChange={e => setRegionFilter(e.target.value)}>
                  <option value="all">All</option>
                  <option value="Africa">Africa</option>
                  <option value="Asia">Asia</option>
                  <option value="Europe">Europe</option>
                  <option value="North America">North America</option>
                  <option value="South America">South America</option>
                  <option value="Oceania">Oceania</option>
                  <option value="Middle East">Middle East</option>
                  <option value="Caribbean">Caribbean</option>
                  <option value="Latin America">Latin America</option>
                </select>
              </Row>
            )}
          </div>
        )}

        {/* ════ COLORS ════ */}
        <Hdr id="colors" label="COLORS" right={
          <button className="bw-btn" onClick={applyBW}>B&amp;W</button>
        } />
        {open.colors && (
          <div className="sec-body">
            <Row label="Fill">
              <Swatch value={fillColor} onChange={setFillColor} />
            </Row>
            <Row label="Stroke">
              <Swatch value={strokeColor} onChange={setStrokeColor} />
            </Row>
            <Row label="Width">
              <input
                type="range" min="0.1" max="4" step="0.1"
                value={strokeWidth}
                style={tf(strokeWidth, 0.1, 4)}
                onChange={e => setStrokeWidth(parseFloat(e.target.value))}
              />
              <span className="val-lbl">{strokeWidth}</span>
            </Row>
            <Row label="Bg">
              <Swatch value={bgColor} onChange={setBgColor} />
            </Row>
            <Row label="Water">
              <Swatch value={waterColor} onChange={setWaterColor} />
              <input type="checkbox" checked={showWater} onChange={e => setShowWater(e.target.checked)} />
            </Row>
            <Row label="Gratic.">
              <Swatch value={graticuleColor} onChange={setGraticuleColor} />
              <input type="checkbox" checked={showGraticule} onChange={e => setShowGraticule(e.target.checked)} />
            </Row>
            {showGraticule && (
              <Row label="Step">
                <input
                  type="range" min="5" max="30" step="5"
                  value={graticuleStep}
                  style={tf(graticuleStep, 5, 30)}
                  onChange={e => setGraticuleStep(parseInt(e.target.value))}
                />
                <span className="val-lbl">{graticuleStep}°</span>
              </Row>
            )}
          </div>
        )}

        {/* ════ SIMPLIFICATION ════ */}
        <Hdr id="simplify" label="SIMPLIFICATION" />
        {open.simplify && (
          <div className="sec-body">
            <Row label="Method">
              <select value={simplificationMethod} onChange={e => setSimplificationMethod(e.target.value)}>
                <option value="visvalingam-spherical">Visvalingam (spherical)</option>
                <option value="visvalingam-planar">Visvalingam (planar)</option>
              </select>
            </Row>
            <Row label="Amount">
              <input
                type="range" min="0" max="100" step="1"
                value={localSimplify}
                style={tf(localSimplify, 0, 100)}
                onChange={e => setLocalSimplify(parseInt(e.target.value))}
                onPointerUp={e => setSimplificationAmount(parseInt(e.target.value))}
              />
              <span className="val-lbl">{localSimplify}%</span>
            </Row>
          </div>
        )}

        {/* ════ FILL TOOL ════ */}
        <Hdr id="fill" label="FILL TOOL" />
        {open.fill && (
          <div className="sec-body">
            <div className="fill-tool-row">
              <button
                className={`icon-btn${fillToolActive ? ' active' : ''}`}
                onClick={() => setFillToolActive(!fillToolActive)}
                title="Toggle fill tool"
              >
                <Paintbrush size={14} />
              </button>
              <Swatch value={fillToolColor} onChange={setFillToolColor} large />
              <button
                className="icon-btn danger"
                onClick={onResetOverrides}
                title="Clear all color overrides"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        )}

        {/* ════ LABELS ════ */}
        <Hdr id="labels" label="LABELS" />
        {open.labels && (
          <div className="sec-body">
            <Row label="Show">
              <input type="checkbox" checked={showLabels} onChange={e => setShowLabels(e.target.checked)} />
            </Row>
            {showLabels && (
              <>
                <Row label="Fit">
                  <input type="checkbox" checked={fitLabels} onChange={e => setFitLabels(e.target.checked)} />
                </Row>
                <Row label="Color">
                  <Swatch value={labelColor} onChange={setLabelColor} />
                </Row>
                <Row label="Size">
                  <input
                    type="range" min="6" max="32" step="1"
                    value={labelSize}
                    style={tf(labelSize, 6, 32)}
                    onChange={e => setLabelSize(parseInt(e.target.value))}
                  />
                  <span className="val-lbl">{labelSize}</span>
                </Row>
                <Row label="Font">
                  <select value={labelFont} onChange={e => setLabelFont(e.target.value)}>
                    <option value="Inter">Inter</option>
                    <option value="Outfit">Outfit</option>
                    <option value="Space Grotesk">Space Grotesk</option>
                    <option value="Georgia">Georgia (Serif)</option>
                    <option value="monospace">Monospace</option>
                  </select>
                </Row>
                <div className="labels-footer">
                  <button className="sm-btn" onClick={onReset}>Reset</button>
                </div>
              </>
            )}
          </div>
        )}

        {/* ════ POLYGONS ════ */}
        <Hdr id="polygons" label="POLYGONS" />
        {open.polygons && (
          <div className="sec-body">
            <div className="poly-toolbar">
              <button className="sm-btn" onClick={showAll}>All</button>
              <button className="sm-btn" onClick={hideAll}>None</button>
              <button
                className={`sm-btn${!sortAZ ? ' active' : ''}`}
                onClick={() => setSortAZ(p => !p)}
              >
                {sortAZ ? 'A–Z ▲' : 'Z–A ▼'}
              </button>
              <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--txt-muted)' }}>
                {shapes.length}
              </span>
            </div>

            <div className="filter-wrap">
              <input
                className="filter-input"
                type="text"
                placeholder="Filter..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="poly-list">
              {shapes.length === 0 ? (
                <div style={{ padding: '8px 10px', fontSize: 10, color: 'var(--txt-muted)' }}>
                  No regions found
                </div>
              ) : (
                shapes.map((f, idx) => {
                  const key = f.properties.shapeID || f.properties.shapeName || `f-${idx}`;
                  const name = f.properties.shapeName;
                  const isVisible = visibilityOverrides[key] !== false;
                  const color = fillOverrides[key] || fillColor;
                  return (
                    <div key={key} className={`poly-item${!isVisible ? ' poly-hidden' : ''}`}>
                      <label className="swatch-btn" title={color}>
                        <span className="swatch" style={{ background: color, width: 14, height: 14 }} />
                        <input
                          type="color"
                          value={color}
                          onChange={e => setFillOverrides(p => ({ ...p, [key]: e.target.value }))}
                        />
                      </label>
                      <span className="poly-name" title={name}>{name}</span>
                      <button
                        className="poly-vis-btn"
                        onClick={() => setVisibilityOverrides(p => ({
                          ...p, [key]: p[key] === false ? undefined : false,
                        }))}
                        title={isVisible ? 'Hide' : 'Show'}
                      >
                        {isVisible ? <Eye size={12} /> : <EyeOff size={12} />}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

      </div>

      {/* ── Fixed Footer: Export ── */}
      <div className="sb-footer">
        <div className="footer-row">
          <button className="export-btn primary" onClick={handleExportSVG}>
            <Download size={12} /> SVG
          </button>
          <button className="export-btn" onClick={handleExportPNG}>
            <Download size={12} /> PNG
          </button>
          <button className="export-btn e-danger" onClick={onReset}>
            <RotateCcw size={12} /> Reset
          </button>
        </div>
      </div>
    </div>
  );
}

export default Sidebar;
