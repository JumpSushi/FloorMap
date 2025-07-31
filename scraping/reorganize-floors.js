#!/usr/bin/env node
/**
 * Reorganize floor levels:
 * - Rename floor -2 to B (basement)
 * - Rename floor 0 to G (ground)
 * - Add floor M (mezzanine) between G and 1
 * - Keep floors 1-6 as they are
 */

import fs from 'fs';

const buildingJsonPath = '/Users/kevin/Documents/GitHub/openindoormaps/app/mock/building.json';

console.log('📖 Reading current building.json...');
const buildingData = JSON.parse(fs.readFileSync(buildingJsonPath, 'utf8'));

console.log('🏢 Reorganizing floor levels...');

// Define the floor mapping
const floorMapping = {
  '-2': 'B',  // Basement
  // Note: G and M will be new floors we add, existing 1-6 stay the same
};

// We'll also need to add new floors G and M with copied data
console.log('Floor changes:');
console.log('  -2 → B (Basement)');
console.log('  New: G (Ground floor)');
console.log('  New: M (Mezzanine)');
console.log('  1-6 → unchanged');

// Helper function to map floor levels
function mapFloorLevel(level) {
  if (typeof level === 'number') {
    level = level.toString();
  }
  return floorMapping[level] || level;
}

// Update indoor map features
console.log('\n🗺️ Updating indoor map features...');
let indoorUpdated = 0;

// First, rename -2 to B
buildingData.indoor_map.features.forEach(feature => {
  if (feature.properties && feature.properties.level_id === -2) {
    feature.properties.level_id = 'B';
    indoorUpdated++;
    
    // Also update original_tags if they exist
    if (feature.properties.original_tags && feature.properties.original_tags.level) {
      feature.properties.original_tags.level = 'B';
    }
  }
});

// Create new floors G and M by copying floor 1 data
const floor1Features = buildingData.indoor_map.features.filter(f => f.properties.level_id === 1);
console.log(`📋 Found ${floor1Features.length} features on floor 1 to copy for G and M`);

// Create Ground floor (G) features
const groundFloorFeatures = floor1Features.map(feature => {
  const newFeature = JSON.parse(JSON.stringify(feature)); // Deep clone
  newFeature.properties.level_id = 'G';
  
  // Update room numbers for ground floor (change 1xx to Gxx)
  if (newFeature.properties.name && newFeature.properties.name.match(/^1\d\d$/)) {
    newFeature.properties.name = newFeature.properties.name.replace(/^1/, 'G');
  }
  
  // Update original tags
  if (newFeature.properties.original_tags) {
    newFeature.properties.original_tags.level = 'G';
    if (newFeature.properties.original_tags.name && newFeature.properties.original_tags.name.match(/^1\d\d$/)) {
      newFeature.properties.original_tags.name = newFeature.properties.original_tags.name.replace(/^1/, 'G');
    }
  }
  
  // Slightly adjust coordinates to distinguish from floor 1
  const adjustCoords = (coords) => {
    if (Array.isArray(coords[0])) {
      return coords.map(ring => ring.map(coord => [coord[0] - 0.000001, coord[1] - 0.000001]));
    } else {
      return [coords[0] - 0.000001, coords[1] - 0.000001];
    }
  };
  
  newFeature.geometry.coordinates = adjustCoords(newFeature.geometry.coordinates);
  
  return newFeature;
});

// Create Mezzanine floor (M) features  
const mezzanineFeatures = floor1Features.map(feature => {
  const newFeature = JSON.parse(JSON.stringify(feature)); // Deep clone
  newFeature.properties.level_id = 'M';
  
  // Update room numbers for mezzanine (change 1xx to Mxx)
  if (newFeature.properties.name && newFeature.properties.name.match(/^1\d\d$/)) {
    newFeature.properties.name = newFeature.properties.name.replace(/^1/, 'M');
  }
  
  // Update original tags
  if (newFeature.properties.original_tags) {
    newFeature.properties.original_tags.level = 'M';
    if (newFeature.properties.original_tags.name && newFeature.properties.original_tags.name.match(/^1\d\d$/)) {
      newFeature.properties.original_tags.name = newFeature.properties.original_tags.name.replace(/^1/, 'M');
    }
  }
  
  // Slightly adjust coordinates to distinguish from floor 1 and G
  const adjustCoords = (coords) => {
    if (Array.isArray(coords[0])) {
      return coords.map(ring => ring.map(coord => [coord[0] + 0.000001, coord[1] + 0.000001]));
    } else {
      return [coords[0] + 0.000001, coords[1] + 0.000001];
    }
  };
  
  newFeature.geometry.coordinates = adjustCoords(newFeature.geometry.coordinates);
  
  return newFeature;
});

// Add new floors to the features array
buildingData.indoor_map.features.push(...groundFloorFeatures, ...mezzanineFeatures);
indoorUpdated += groundFloorFeatures.length + mezzanineFeatures.length;

// Update POIs
console.log('🏷️ Updating POI floors...');
let poisUpdated = 0;
let nextPOIId = Math.max(...buildingData.pois.features.map(p => p.properties.id)) + 1;

// First, rename floor -2 to B
buildingData.pois.features.forEach(poi => {
  if (poi.properties && poi.properties.floor === -2) {
    poi.properties.floor = 'B';
    poisUpdated++;
    
    // Update metadata
    if (poi.properties.metadata && poi.properties.metadata.level !== undefined) {
      poi.properties.metadata.level = 'B';
    }
    
    // Update description
    if (poi.properties.metadata && poi.properties.metadata.description) {
      poi.properties.metadata.description = poi.properties.metadata.description
        .replace(/floor -2/gi, 'floor B')
        .replace(/Floor -2/g, 'Floor B');
    }
  }
});

// Create new POIs for floors G and M by copying floor 1 POIs
const floor1POIs = buildingData.pois.features.filter(p => p.properties.floor === 1);
console.log(`📋 Found ${floor1POIs.length} POIs on floor 1 to copy for G and M`);

// Create Ground floor (G) POIs
const groundFloorPOIs = floor1POIs.map(poi => {
  const newPOI = JSON.parse(JSON.stringify(poi)); // Deep clone
  newPOI.properties.id = nextPOIId++;
  newPOI.properties.floor = 'G';
  
  // Update names that include floor numbers
  if (newPOI.properties.name.includes('Room 1')) {
    newPOI.properties.name = newPOI.properties.name.replace(/Room 1(\d\d)/, 'Room G$1');
  } else if (newPOI.properties.name.includes('Floor 1')) {
    newPOI.properties.name = newPOI.properties.name.replace('Floor 1', 'Floor G');
  }
  
  // Update metadata
  if (newPOI.properties.metadata) {
    newPOI.properties.metadata.level = 'G';
    if (newPOI.properties.metadata.description) {
      newPOI.properties.metadata.description = newPOI.properties.metadata.description
        .replace(/floor 1/gi, 'floor G')
        .replace(/Floor 1/g, 'Floor G');
    }
  }
  
  // Adjust coordinates
  newPOI.geometry.coordinates = [
    newPOI.geometry.coordinates[0] - 0.000001,
    newPOI.geometry.coordinates[1] - 0.000001
  ];
  
  return newPOI;
});

// Create Mezzanine floor (M) POIs
const mezzaninePOIs = floor1POIs.map(poi => {
  const newPOI = JSON.parse(JSON.stringify(poi)); // Deep clone
  newPOI.properties.id = nextPOIId++;
  newPOI.properties.floor = 'M';
  
  // Update names that include floor numbers
  if (newPOI.properties.name.includes('Room 1')) {
    newPOI.properties.name = newPOI.properties.name.replace(/Room 1(\d\d)/, 'Room M$1');
  } else if (newPOI.properties.name.includes('Floor 1')) {
    newPOI.properties.name = newPOI.properties.name.replace('Floor 1', 'Floor M');
  }
  
  // Update metadata
  if (newPOI.properties.metadata) {
    newPOI.properties.metadata.level = 'M';
    if (newPOI.properties.metadata.description) {
      newPOI.properties.metadata.description = newPOI.properties.metadata.description
        .replace(/floor 1/gi, 'floor M')
        .replace(/Floor 1/g, 'Floor M');
    }
  }
  
  // Adjust coordinates
  newPOI.geometry.coordinates = [
    newPOI.geometry.coordinates[0] + 0.000001,
    newPOI.geometry.coordinates[1] + 0.000001
  ];
  
  return newPOI;
});

// Add new POIs to the features array
buildingData.pois.features.push(...groundFloorPOIs, ...mezzaninePOIs);
poisUpdated += groundFloorPOIs.length + mezzaninePOIs.length;

// Update indoor routes
console.log('🛤️ Updating indoor routes...');
let routesUpdated = 0;

// First, rename -2 to B
buildingData.indoor_routes.features.forEach(route => {
  if (route.properties && route.properties.level === -2) {
    route.properties.level = 'B';
    routesUpdated++;
  }
});

// Create new routes for floors G and M by copying floor 1 routes
const floor1Routes = buildingData.indoor_routes.features.filter(r => r.properties.level === 1);
console.log(`📋 Found ${floor1Routes.length} routes on floor 1 to copy for G and M`);

// Create Ground floor (G) routes
const groundFloorRoutes = floor1Routes.map(route => {
  const newRoute = JSON.parse(JSON.stringify(route)); // Deep clone
  newRoute.properties.level = 'G';
  
  // Update room references
  if (newRoute.properties.room && newRoute.properties.room.match(/^1\d\d$/)) {
    newRoute.properties.room = newRoute.properties.room.replace(/^1/, 'G');
  }
  
  // Adjust coordinates
  newRoute.geometry.coordinates = newRoute.geometry.coordinates.map(coord => [
    coord[0] - 0.000001,
    coord[1] - 0.000001
  ]);
  
  return newRoute;
});

// Create Mezzanine floor (M) routes
const mezzanineRoutes = floor1Routes.map(route => {
  const newRoute = JSON.parse(JSON.stringify(route)); // Deep clone
  newRoute.properties.level = 'M';
  
  // Update room references
  if (newRoute.properties.room && newRoute.properties.room.match(/^1\d\d$/)) {
    newRoute.properties.room = newRoute.properties.room.replace(/^1/, 'M');
  }
  
  // Adjust coordinates
  newRoute.geometry.coordinates = newRoute.geometry.coordinates.map(coord => [
    coord[0] + 0.000001,
    coord[1] + 0.000001
  ]);
  
  return newRoute;
});

// Add new routes to the features array
buildingData.indoor_routes.features.push(...groundFloorRoutes, ...mezzanineRoutes);
routesUpdated += groundFloorRoutes.length + mezzanineRoutes.length;

// Write updated file
fs.writeFileSync(buildingJsonPath, JSON.stringify(buildingData, null, 2));

console.log('\n✅ Successfully reorganized floor levels!');
console.log('\n📊 Update Summary:');
console.log(`  🗺️ Indoor features updated: ${indoorUpdated}`);
console.log(`  🏷️ POIs updated: ${poisUpdated}`);
console.log(`  🛤️ Routes updated: ${routesUpdated}`);

console.log('\n🏢 New floor structure:');
console.log('  B  - Basement');
console.log('  G  - Ground floor');
console.log('  M  - Mezzanine');
console.log('  1  - First floor');
console.log('  2  - Second floor');
console.log('  3  - Third floor');
console.log('  4  - Fourth floor');
console.log('  5  - Fifth floor');
console.log('  6  - Sixth floor');

console.log('\n🚀 Floor reorganization complete!');
