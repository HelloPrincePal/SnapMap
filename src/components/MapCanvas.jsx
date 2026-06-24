import React, { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';

function MapCanvas({
  level,
  geojson,
  projectionType,
  
  // Style states
  fillColor,
  strokeColor,
  strokeWidth,
  waterColor,
  graticuleColor,
  showWater,
  showGraticule,
  graticuleStep,

  // Labels
  showLabels,
  labelColor,
  labelSize,
  labelFont,
  fitLabels,

  // Overrides
  fillOverrides,
  setFillOverrides,
  visibilityOverrides,
  fillToolActive,
  fillToolColor,

  // Click actions
  onCountryClick,
  onStateClick
}) {
  const svgRef = useRef(null);
  const gRef = useRef(null);
  const zoomBehaviorRef = useRef(null);

  // Tooltip tracking
  const [tooltip, setTooltip] = useState({ show: false, x: 0, y: 0, title: '', meta: '' });
  
  // Viewport dimensions
  const [width, setWidth] = useState(800);
  const [height, setHeight] = useState(600);

  // 1. Measure container size on mount & resize
  useEffect(() => {
    const handleResize = () => {
      if (svgRef.current) {
        const parent = svgRef.current.parentNode;
        setWidth(parent.clientWidth);
        setHeight(parent.clientHeight);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 2. Set up D3 Zoom behavior
  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    const g = d3.select(gRef.current);

    const zoom = d3.zoom()
      .scaleExtent([0.2, 80])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom);
    zoomBehaviorRef.current = zoom;

    // Reset zoom when map level changes
    svg.transition().duration(400).call(zoom.transform, d3.zoomIdentity);
  }, [level, geojson]); // Trigger reset on level/data change

  // 3. Configure D3 Projection based on type & fit bounds
  let projection = null;
  switch (projectionType) {
    case 'mercator':
      projection = d3.geoMercator();
      break;
    case 'orthographic':
      projection = d3.geoOrthographic();
      break;
    case 'albers':
      // For general cases, Albers equal area centered on our data
      projection = d3.geoConicEqualArea();
      break;
    case 'equirectangular':
    default:
      projection = d3.geoEquirectangular();
      break;
  }

  // Auto-fit projection to container and current GeoJSON features
  if (geojson && geojson.features && geojson.features.length > 0) {
    try {
      if (projectionType === 'orthographic') {
        // Orthographic (globe) needs specific scaling to stay circular
        const bounds = d3.geoBounds(geojson);
        const center = [
          (bounds[0][0] + bounds[1][0]) / 2,
          (bounds[0][1] + bounds[1][1]) / 2
        ];
        projection
          .scale(Math.min(width, height) * 0.4)
          .center([0, 0])
          .rotate([-center[0], -center[1], 0])
          .translate([width / 2, height / 2]);
      } else if (projectionType === 'albers') {
        // Fit conic area centered properly
        const bounds = d3.geoBounds(geojson);
        const center = [
          (bounds[0][0] + bounds[1][0]) / 2,
          (bounds[0][1] + bounds[1][1]) / 2
        ];
        projection
          .parallels([bounds[0][1], bounds[1][1]])
          .rotate([-center[0], 0, 0])
          .center([0, center[1]])
          .fitSize([width - 80, height - 80], geojson);
      } else {
        // Standard fit for Mercator/Equirectangular
        projection
          .fitSize([width - 80, height - 80], geojson);
      }
    } catch (e) {
      console.warn('Projection fit failed, falling back to default:', e);
      // Fallback defaults
      projection
        .scale(100)
        .translate([width / 2, height / 2]);
    }
  } else {
    // Default world center
    projection
      .scale(100)
      .translate([width / 2, height / 2]);
  }

  const pathGenerator = d3.geoPath().projection(projection);

  // Helper calculations
  const spherePath = pathGenerator({ type: 'Sphere' });
  
  let graticulePath = '';
  if (showGraticule) {
    const graticule = d3.geoGraticule().step([graticuleStep, graticuleStep])();
    graticulePath = pathGenerator(graticule);
  }

  // 4. Zoom actions
  const handleZoomIn = () => {
    if (zoomBehaviorRef.current) {
      d3.select(svgRef.current).transition().duration(250).call(zoomBehaviorRef.current.scaleBy, 1.4);
    }
  };

  const handleZoomOut = () => {
    if (zoomBehaviorRef.current) {
      d3.select(svgRef.current).transition().duration(250).call(zoomBehaviorRef.current.scaleBy, 1 / 1.4);
    }
  };

  const handleResetZoom = () => {
    if (zoomBehaviorRef.current) {
      d3.select(svgRef.current).transition().duration(300).call(zoomBehaviorRef.current.transform, d3.zoomIdentity);
    }
  };

  // 5. Interactivity Handlers
  const handleMouseOver = (event, feature) => {
    const name = feature.properties.shapeName || 'Unnamed region';
    const group = feature.properties.shapeGroup || '';
    const id = feature.properties.shapeID || '';
    
    let metaText = `ID: ${id}`;
    if (level === 'world' && group) {
      metaText += ` (${group})`;
    } else if (level === 'state') {
      metaText = 'District details';
    }

    setTooltip({
      show: true,
      x: event.clientX,
      y: event.clientY,
      title: name,
      meta: metaText
    });
  };

  const handleMouseMove = (event) => {
    setTooltip(prev => ({
      ...prev,
      x: event.clientX,
      y: event.clientY
    }));
  };

  const handleMouseOut = () => {
    setTooltip(prev => ({ ...prev, show: false }));
  };

  const handleFeatureClick = (feature) => {
    const key = feature.properties.shapeID || feature.properties.shapeName;

    // Paint bucket action
    if (fillToolActive) {
      setFillOverrides(prev => ({
        ...prev,
        [key]: prev[key] === fillToolColor ? undefined : fillToolColor
      }));
      return;
    }

    // Drill down action
    if (level === 'world') {
      onCountryClick(feature);
    } else if (level === 'country') {
      onStateClick(feature);
    }
  };

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      {/* Tooltip Popup */}
      {tooltip.show && (
        <div 
          className="map-tooltip"
          style={{ 
            left: `${tooltip.x}px`, 
            top: `${tooltip.y}px`
          }}
        >
          <span className="tooltip-title">{tooltip.title}</span>
          <span className="tooltip-meta">{tooltip.meta}</span>
          {fillToolActive && <span style={{ fontSize: '0.6rem', color: 'var(--accent-gold)' }}>Click to fill color</span>}
        </div>
      )}

      {/* Floating Canvas Controls */}
      <div className="floating-controls">
        <button className="map-ctrl-btn" onClick={handleResetZoom} title="Reset zoom">⌂</button>
        <button className="map-ctrl-btn" onClick={handleZoomIn} title="Zoom in">+</button>
        <button className="map-ctrl-btn" onClick={handleZoomOut} title="Zoom out">−</button>
      </div>

      {/* The Core SVG Map */}
      <svg
        id="map-svg"
        ref={svgRef}
        className={`map-svg ${fillToolActive ? 'fill-tool-active' : ''}`}
        style={{ width: '100%', height: '100%' }}
      >
        <defs>
          {/* Defs block */}
        </defs>

        {/* Outer background/water rendering */}
        {showWater && projectionType !== 'orthographic' && (
          <rect width={width} height={height} fill={waterColor} />
        )}

        <g ref={gRef}>
          {/* Orthographic Sphere (Globe ocean background) */}
          {showWater && projectionType === 'orthographic' && spherePath && (
            <path d={spherePath} fill={waterColor} />
          )}

          {/* Graticule grid lines */}
          {showGraticule && graticulePath && (
            <path
              d={graticulePath}
              fill="none"
              stroke={graticuleColor}
              strokeWidth="0.5"
              opacity="0.3"
              style={{ pointerEvents: 'none' }}
            />
          )}

          {/* Polygon Geometries */}
          {geojson && geojson.features && (
            <g className="map-features">
              {geojson.features.map((feature, idx) => {
                const key = feature.properties.shapeID || feature.properties.shapeName || `f-${idx}`;
                
                // Check overrides
                const isHidden = visibilityOverrides[key] === false;
                if (isHidden) return null;

                const customColor = fillOverrides[key] || fillColor;
                const pathData = pathGenerator(feature);

                if (!pathData) return null;

                return (
                  <path
                    key={key}
                    d={pathData}
                    fill={customColor}
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    vectorEffect="non-scaling-stroke"
                    style={{
                      transition: 'fill 0.2s, stroke-width 0.2s',
                      cursor: fillToolActive ? 'pointer' : (level === 'state' ? 'default' : 'pointer'),
                    }}
                    onMouseOver={(e) => handleMouseOver(e, feature)}
                    onMouseMove={handleMouseMove}
                    onMouseOut={handleMouseOut}
                    onClick={() => handleFeatureClick(feature)}
                    // Dynamic highlight hover in CSS/inline styles
                    className="map-path"
                  />
                );
              })}
            </g>
          )}

          {/* Labels layer (drawn on top of shapes) */}
          {showLabels && geojson && geojson.features && (
            <g className="map-labels" style={{ pointerEvents: 'none' }}>
              {geojson.features.map((feature, idx) => {
                const key = feature.properties.shapeID || feature.properties.shapeName || `lbl-${idx}`;
                
                // Hide label if feature is hidden
                if (visibilityOverrides[key] === false) return null;

                // Centroid coordinates
                const centroid = pathGenerator.centroid(feature);
                if (!centroid || isNaN(centroid[0]) || isNaN(centroid[1])) return null;
                
                const name = feature.properties.shapeName;
                if (!name) return null;

                // For fitLabels, dynamically calculate a custom font-size based on the exact boundary box dimensions
                let finalSize = labelSize;
                if (fitLabels) {
                  try {
                    const bounds = pathGenerator.bounds(feature);
                    const dx = bounds[1][0] - bounds[0][0];
                    const dy = bounds[1][1] - bounds[0][1];
                    
                    // Approximate width of a standard character relative to font size (around 0.55 aspect ratio)
                    const charAspectRatio = 0.55;
                    const estimatedTextWidth = name.length * charAspectRatio;
                    
                    // Max font sizes to fit width and height with small padding margins
                    const maxFitWidth = (dx * 0.9) / estimatedTextWidth;
                    const maxFitHeight = dy * 0.75;
                    
                    const maxFitSize = Math.min(maxFitWidth, maxFitHeight);
                    finalSize = Math.min(labelSize, maxFitSize);
                    
                    // If the text size required to fit is microscopic (< 6.5px), hide the label to avoid clutter
                    if (finalSize < 6.5) {
                      return null;
                    }
                  } catch (e) {
                    finalSize = labelSize;
                  }
                }

                return (
                  <text
                    key={`lbl-${key}`}
                    x={centroid[0]}
                    y={centroid[1]}
                    fill={labelColor}
                    fontSize={finalSize}
                    fontFamily={labelFont}
                    fontWeight="500"
                    textAnchor="middle"
                    dominantBaseline="central"
                    style={{
                      userSelect: 'none'
                    }}
                  >
                    {name}
                  </text>
                );
              })}
            </g>
          )}
        </g>
      </svg>
    </div>
  );
}

export default MapCanvas;
