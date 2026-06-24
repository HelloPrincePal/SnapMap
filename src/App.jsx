import React, { useState, useEffect } from 'react';
import * as topojson from 'topojson-client';
import MapCanvas from './components/MapCanvas';
import Sidebar from './components/Sidebar';
import { numericToIso3, iso3ToName, alpha2ToIso3, countryMetadata } from './utils/isoData';
import { mapDistrictsToStates, simplifyGeoJSON, rewindGeoJSON } from './utils/geoUtils';
import { AlertTriangle } from 'lucide-react';

function App() {
  // Navigation / Hierarchical state
  const [level, setLevel] = useState('world'); // 'world' | 'country' | 'state'
  const [selectedCountry, setSelectedCountry] = useState(null); // { id, name, iso3 }
  const [selectedState, setSelectedState] = useState(null); // { name }

  // Map Views & Regional filters
  const [mapViewType, setMapViewType] = useState('worldLow'); // amCharts map identifier
  const [regionFilter, setRegionFilter] = useState('all'); // Continents/Regions filters

  // Geodata cache state
  const [worldGeoJSON, setWorldGeoJSON] = useState(null);
  const [countryAdm1GeoJSON, setCountryAdm1GeoJSON] = useState(null);
  const [districtMapping, setDistrictMapping] = useState({}); // { [stateName]: [districtFeatures] }
  
  // Loading & Error states
  const [loading, setLoading] = useState(true);
  const [loadingText, setLoadingText] = useState('Loading World Map...');
  const [error, setError] = useState(null);

  // Global styles state
  const [projectionType, setProjectionType] = useState('equirectangular');
  const [fillColor, setFillColor] = useState('#b5905b');
  const [strokeColor, setStrokeColor] = useState('#282c34');
  const [strokeWidth, setStrokeWidth] = useState(0.8);
  const [bgColor, setBgColor] = useState('#13151b');
  const [waterColor, setWaterColor] = useState('#0d0f12');
  const [graticuleColor, setGraticuleColor] = useState('#1d222b');
  const [showWater, setShowWater] = useState(true);
  const [showGraticule, setShowGraticule] = useState(true);
  const [graticuleStep, setGraticuleStep] = useState(15);

  // Labels config
  const [showLabels, setShowLabels] = useState(true);
  const [labelColor, setLabelColor] = useState('#ffffff');
  const [labelSize, setLabelSize] = useState(12);
  const [labelFont, setLabelFont] = useState('Inter');
  const [fitLabels, setFitLabels] = useState(true);

  // Polygon overrides
  const [fillOverrides, setFillOverrides] = useState({}); // { shapeID/shapeName: color }
  const [visibilityOverrides, setVisibilityOverrides] = useState({}); // { shapeID/shapeName: boolean }
  const [fillToolActive, setFillToolActive] = useState(false);
  const [fillToolColor, setFillToolColor] = useState('#e11d48');

  // Simplification
  const [simplificationAmount, setSimplificationAmount] = useState(0); // 0 to 100

  // Simplification method
  const [simplificationMethod, setSimplificationMethod] = useState('visvalingam-spherical');

  const [searchQuery, setSearchQuery] = useState('');

  // 1. Load World Map (or requested map variant)
  useEffect(() => {
    setLoading(true);
    setLoadingText(`Loading Map ${mapViewType}...`);
    setError(null);

    const url = `https://unpkg.com/@amcharts/amcharts4-geodata@4.1.27/json/${mapViewType}.json`;
    fetch(url)
      .then(res => {
        if (!res.ok) throw new Error(`Failed to load world map variant: ${mapViewType}`);
        return res.json();
      })
      .then(geojson => {
        // Correct polygon coordinate winding order for D3 rendering
        let rewound = rewindGeoJSON(geojson);
        
        // Standardize properties to have shapeName, shapeGroup, shapeID
        rewound.features = rewound.features.map(f => {
          // amCharts features have Alpha-2 ids (e.g. "IN") or properties.id
          const a2 = f.id || f.properties.id || '';
          const iso3 = alpha2ToIso3[a2] || '';
          const name = f.properties.name || iso3ToName[iso3] || a2;
          return {
            ...f,
            properties: {
              ...f.properties,
              shapeName: name,
              shapeGroup: iso3,
              shapeID: iso3 ? `world-${iso3}` : `world-${a2}`
            }
          };
        });
        
        setWorldGeoJSON(rewound);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError(`Error loading map data: ${err.message}. Check your connection.`);
        setLoading(false);
      });
  }, [mapViewType]);

  // 2. Clear state overrides when changing country or level
  const resetOverrides = () => {
    setFillOverrides({});
    setVisibilityOverrides({});
  };

  // 3. Drill down to Country level (ADM1)
  const handleCountryClick = (countryFeature) => {
    const iso3 = countryFeature.properties.shapeGroup;
    const name = countryFeature.properties.shapeName;

    if (!iso3) {
      // Disallow drilldown for non-country entities (like continents)
      return;
    }

    setLoading(true);
    setLoadingText(`Fetching boundaries for ${name} (ADM1)...`);
    setError(null);
    setSelectedCountry({ id: iso3, name, iso3 });
    setSelectedState(null);

    // Fetch ADM1 metadata
    fetch(`https://www.geoboundaries.org/api/current/gbOpen/${iso3}/ADM1/`)
      .then(res => {
        if (!res.ok) throw new Error('Administrative Level 1 boundaries not available for this country.');
        return res.json();
      })
      .then(meta => {
        // Fetch simplified geojson with raw github URL to bypass CORS redirects
        const rawUrl = meta.simplifiedGeometryGeoJSON
          .replace('github.com', 'media.githubusercontent.com/media')
          .replace('/raw/', '/');
        return fetch(rawUrl);
      })
      .then(res => {
        if (!res.ok) throw new Error('Failed to retrieve boundary shapes.');
        return res.json();
      })
      .then(geojson => {
        // Standardize properties to match shapeName and shapeID
        geojson.features = geojson.features.map((f, idx) => ({
          ...f,
          properties: {
            ...f.properties,
            shapeName: f.properties.shapeName || `State ${idx + 1}`,
            shapeID: f.properties.shapeID || `adm1-${idx}`
          }
        }));
        // Rewind geometries to correct D3 winding order (prevent inverted giant boxes)
        const rewoundGeoJSON = rewindGeoJSON(geojson);
        setCountryAdm1GeoJSON(rewoundGeoJSON);
        setLevel('country');
        resetOverrides();
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError(`Unable to drill down into ${name}: ${err.message}`);
        setLoading(false);
        setSelectedCountry(null);
      });
  };

  // 4. Drill down to State level (ADM2)
  const handleStateClick = (stateFeature) => {
    const stateName = stateFeature.properties.shapeName;
    const iso3 = selectedCountry.iso3;

    setLoading(true);
    setLoadingText(`Fetching boundaries for districts (ADM2)...`);
    setError(null);

    // We fetch the entire country's ADM2, then filter in the client!
    fetch(`https://www.geoboundaries.org/api/current/gbOpen/${iso3}/ADM2/`)
      .then(res => {
        if (!res.ok) throw new Error('Administrative Level 2 (districts) boundaries not available.');
        return res.json();
      })
      .then(meta => {
        // Fetch simplified geojson with raw github URL to bypass CORS redirects
        const rawUrl = meta.simplifiedGeometryGeoJSON
          .replace('github.com', 'media.githubusercontent.com/media')
          .replace('/raw/', '/');
        return fetch(rawUrl);
      })
      .then(res => {
        if (!res.ok) throw new Error('Failed to retrieve district shapes.');
        return res.json();
      })
      .then(geojson => {
        geojson.features = geojson.features.map((f, idx) => ({
          ...f,
          properties: {
            ...f.properties,
            shapeName: f.properties.shapeName || `District ${idx + 1}`,
            shapeID: f.properties.shapeID || `adm2-${idx}`
          }
        }));

        // Rewind geometries to correct D3 winding order (prevent inverted giant boxes)
        const rewoundGeoJSON = rewindGeoJSON(geojson);

        // Run client-side point-in-polygon spatial join!
        setLoadingText('Mapping districts to states...');
        const mapping = mapDistrictsToStates(countryAdm1GeoJSON, rewoundGeoJSON);
        setDistrictMapping(mapping);

        setSelectedState({ name: stateName });
        setLevel('state');
        resetOverrides();
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError(`Unable to load district boundaries: ${err.message}`);
        setLoading(false);
      });
  };

  // Navigate back levels
  const navigateToWorld = () => {
    setLevel('world');
    setSelectedCountry(null);
    setSelectedState(null);
    setCountryAdm1GeoJSON(null);
    setDistrictMapping({});
    resetOverrides();
  };

  const navigateToCountry = () => {
    setLevel('country');
    setSelectedState(null);
    resetOverrides();
  };

  // Handle dropdown country selector navigation
  const handleCountrySelect = (iso3) => {
    if (!iso3) {
      navigateToWorld();
      return;
    }

    // Find numeric code and name for the ISO3
    let numericId = '';
    for (const [numId, code] of Object.entries(numericToIso3)) {
      if (code === iso3) {
        numericId = numId;
        break;
      }
    }
    const name = iso3ToName[iso3] || iso3;

    // Call the click handler to fetch ADM1 boundaries
    handleCountryClick({
      id: numericId,
      properties: { shapeName: name, shapeGroup: iso3 }
    });
  };

  // Handle dropdown state selector navigation
  const handleStateSelect = (stateName) => {
    if (!stateName) {
      navigateToCountry();
      return;
    }

    // Find the state feature in countryAdm1GeoJSON
    const stateFeature = countryAdm1GeoJSON.features.find(f => f.properties.shapeName === stateName);
    if (stateFeature) {
      handleStateClick(stateFeature);
    }
  };

  // List of all countries sorted alphabetically for the selector dropdown
  const countryList = Object.entries(iso3ToName).map(([iso3, name]) => ({
    iso3,
    name
  })).sort((a, b) => a.name.localeCompare(b.name));

  // List of states in the active country, sorted alphabetically
  const statesList = countryAdm1GeoJSON
    ? countryAdm1GeoJSON.features.map(f => f.properties.shapeName).sort((a, b) => a.localeCompare(b))
    : [];

  // Determine active dataset to display based on level
  let activeGeoJSON = null;
  if (level === 'world' && worldGeoJSON) {
    // Apply client-side region filters if active
    const filteredFeatures = worldGeoJSON.features.filter(f => {
      if (regionFilter === 'all') return true;
      const iso3 = f.properties.shapeGroup;
      const meta = countryMetadata[iso3];
      if (!meta) return false;

      switch (regionFilter) {
        case 'Africa':
          return meta.region === 'Africa';
        case 'Asia':
          return meta.region === 'Asia';
        case 'Europe':
          return meta.region === 'Europe';
        case 'North America':
          return meta.subRegion === 'Northern America' || meta.subRegion === 'Central America' || meta.subRegion === 'Caribbean';
        case 'South America':
          return meta.subRegion === 'South America' || meta.intermediateRegion === 'South America';
        case 'Oceania':
          return meta.region === 'Oceania';
        case 'Caribbean':
          return meta.subRegion === 'Caribbean';
        case 'Central America':
          return meta.subRegion === 'Central America';
        case 'Latin America':
          return meta.subRegion === 'South America' || meta.subRegion === 'Central America' || meta.subRegion === 'Caribbean';
        case 'Middle East':
          const middleEastList = ['TUR', 'CYP', 'SYR', 'LBN', 'ISR', 'PSE', 'JOR', 'IRQ', 'IRN', 'SAU', 'YEM', 'OMN', 'ARE', 'QAT', 'BHR', 'KWT', 'EGY'];
          return middleEastList.includes(iso3);
        default:
          return true;
      }
    });

    activeGeoJSON = {
      ...worldGeoJSON,
      features: filteredFeatures
    };
  } else if (level === 'country') {
    activeGeoJSON = countryAdm1GeoJSON;
  } else if (level === 'state') {
    // Construct geojson of features matching active state
    const districts = districtMapping[selectedState?.name] || [];
    activeGeoJSON = {
      type: 'FeatureCollection',
      features: districts
    };
  }

  // Apply simplification dynamically to the active GeoJSON if slider > 0
  let renderedGeoJSON = activeGeoJSON;
  if (activeGeoJSON && simplificationAmount > 0) {
    const t = simplificationAmount / 100;
    const tolerance = Math.pow(t, 1.5) * 0.008; // area in sq-degrees, same for both VW variants
    renderedGeoJSON = simplifyGeoJSON(activeGeoJSON, tolerance, simplificationMethod);
  }

  const handleResetSettings = () => {
    setFillColor('#b5905b');
    setStrokeColor('#282c34');
    setStrokeWidth(0.8);
    setBgColor('#13151b');
    setWaterColor('#0d0f12');
    setGraticuleColor('#1d222b');
    setShowWater(true);
    setShowGraticule(true);
    setGraticuleStep(15);
    setShowLabels(true);
    setLabelColor('#ffffff');
    setLabelSize(12);
    setLabelFont('Inter');
    setFitLabels(true);
    setSimplificationAmount(0);
    setSimplificationMethod('visvalingam-spherical');
    resetOverrides();
  };

  return (
    <div className="app-container">
      {/* Dynamic Loading Overlay */}
      {loading && (
        <div className="loading-overlay">
          <div className="spinner"></div>
          <p className="loading-text">{loadingText}</p>
        </div>
      )}

      {/* Main Sidebar controls */}
      <Sidebar
        level={level}
        selectedCountry={selectedCountry}
        selectedState={selectedState}
        activeGeoJSON={activeGeoJSON}
        renderedGeoJSON={renderedGeoJSON}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        
        // Navigation select props
        countryList={countryList}
        statesList={statesList}
        onCountrySelect={handleCountrySelect}
        onStateSelect={handleStateSelect}
        
        // Map views & regional filters props
        mapViewType={mapViewType}
        setMapViewType={setMapViewType}
        regionFilter={regionFilter}
        setRegionFilter={setRegionFilter}
        navigateToWorld={navigateToWorld}
        
        // Control variables
        projectionType={projectionType}
        setProjectionType={setProjectionType}
        fillColor={fillColor}
        setFillColor={setFillColor}
        strokeColor={strokeColor}
        setStrokeColor={setStrokeColor}
        strokeWidth={strokeWidth}
        setStrokeWidth={setStrokeWidth}
        bgColor={bgColor}
        setBgColor={setBgColor}
        waterColor={waterColor}
        setWaterColor={setWaterColor}
        graticuleColor={graticuleColor}
        setGraticuleColor={setGraticuleColor}
        showWater={showWater}
        setShowWater={setShowWater}
        showGraticule={showGraticule}
        setShowGraticule={setShowGraticule}
        graticuleStep={graticuleStep}
        setGraticuleStep={setGraticuleStep}
        
        // Simplification
        simplificationAmount={simplificationAmount}
        setSimplificationAmount={setSimplificationAmount}
        simplificationMethod={simplificationMethod}
        setSimplificationMethod={setSimplificationMethod}

        // Labels
        showLabels={showLabels}
        setShowLabels={setShowLabels}
        labelColor={labelColor}
        setLabelColor={setLabelColor}
        labelSize={labelSize}
        setLabelSize={setLabelSize}
        labelFont={labelFont}
        setLabelFont={setLabelFont}
        fitLabels={fitLabels}
        setFitLabels={setFitLabels}

        // Overrides
        fillOverrides={fillOverrides}
        setFillOverrides={setFillOverrides}
        visibilityOverrides={visibilityOverrides}
        setVisibilityOverrides={setVisibilityOverrides}
        fillToolActive={fillToolActive}
        setFillToolActive={setFillToolActive}
        fillToolColor={fillToolColor}
        setFillToolColor={setFillToolColor}

        // Actions
        onReset={handleResetSettings}
        onResetOverrides={resetOverrides}
      />

      <div className="main-content">
        {/* Dynamic Breadcrumbs Navigation */}
        <div className="breadcrumbs-bar">
          <span 
            className={`breadcrumb-item ${level === 'world' ? 'active' : ''}`}
            onClick={level !== 'world' ? navigateToWorld : undefined}
          >
            World
          </span>
          {selectedCountry && (
            <>
              <span className="breadcrumb-separator">/</span>
              <span 
                className={`breadcrumb-item ${level === 'country' ? 'active' : ''}`}
                onClick={level !== 'country' ? navigateToCountry : undefined}
              >
                {selectedCountry.name}
              </span>
            </>
          )}
          {selectedState && (
            <>
              <span className="breadcrumb-separator">/</span>
              <span className="breadcrumb-item active">
                {selectedState.name}
              </span>
            </>
          )}
        </div>

        {/* Global Error Banner */}
        {error && (
          <div className="error-banner">
            <AlertTriangle size={14} />
            <span>{error}</span>
            <button className="error-dismiss" onClick={() => setError(null)}>✕</button>
          </div>
        )}

        {/* Interactive Visual Canvas */}
        <div className="canvas-container" style={{ backgroundColor: bgColor }}>
          {renderedGeoJSON && (
            <MapCanvas
              level={level}
              geojson={renderedGeoJSON}
              projectionType={projectionType}
              
              // Style states
              fillColor={fillColor}
              strokeColor={strokeColor}
              strokeWidth={strokeWidth}
              waterColor={waterColor}
              graticuleColor={graticuleColor}
              showWater={showWater}
              showGraticule={showGraticule}
              graticuleStep={graticuleStep}

              // Labels
              showLabels={showLabels}
              labelColor={labelColor}
              labelSize={labelSize}
              labelFont={labelFont}
              fitLabels={fitLabels}

              // Overrides
              fillOverrides={fillOverrides}
              setFillOverrides={setFillOverrides}
              visibilityOverrides={visibilityOverrides}
              fillToolActive={fillToolActive}
              fillToolColor={fillToolColor}

              // Actions
              onCountryClick={handleCountryClick}
              onStateClick={handleStateClick}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
