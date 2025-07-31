#!/usr/bin/env node

/**
 * Script to extract ground floor data from g.geojson and merge into building.json
 * Handles indoor features and building extrusion
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔄 Processing ground floor GeoJSON and merging into building.json...');

// Read the files
const buildingPath = path.join(__dirname, 'app', 'mock', 'building.json');
const groundFloorPath = path.join(__dirname, 'g.geojson');

if (!fs.existsSync(buildingPath)) {
  console.error('❌ building.json not found at:', buildingPath);
  process.exit(1);
}

if (!fs.existsSync(groundFloorPath)) {
  console.error('❌ g.geojson not found at:', groundFloorPath);
  process.exit(1);
}

// Read and parse files
let buildingData;
let groundFloorData;

try {
  buildingData = JSON.parse(fs.readFileSync(buildingPath, 'utf8'));
  groundFloorData = JSON.parse(fs.readFileSync(groundFloorPath, 'utf8'));
} catch (error) {
  console.error('❌ Error parsing JSON files:', error.message);
  process.exit(1);
}

console.log('📊 Current building data:');
console.log(`  Indoor map features: ${buildingData.indoor_map.features.length}`);
console.log(`  POI features: ${buildingData.pois.features.length}`);

console.log('📊 Ground floor GeoJSON data:');
console.log(`  Total features: ${groundFloorData.features.length}`);

// Filter relevant features from ground floor data
const relevantFeatures = groundFloorData.features.filter(feature => {
  const props = feature.properties;
  
  // Include ONLY indoor features - no buildings at all
  if (props.indoor || props.level !== undefined) {
    return true;
  }
  
  // Include ONLY amenities that are building-related (these become indoor units)
  if (props.amenity && ['restaurant', 'toilets', 'library', 'cafe'].includes(props.amenity)) {
    return true;
  }
  
  // EXCLUDE all buildings - they should not appear on indoor maps
  // Buildings are exterior and should not be rendered as indoor features
  return false;
});

console.log(`📊 Relevant features found: ${relevantFeatures.length}`);

// Remove any existing ground floor data from building.json
console.log('🗑️ Removing any existing ground floor data...');
const indoorMapBefore = buildingData.indoor_map.features.length;
buildingData.indoor_map.features = buildingData.indoor_map.features.filter(
  feature => feature.properties.level_id !== 'G' && feature.properties.level_id !== 0
);
const removedIndoor = indoorMapBefore - buildingData.indoor_map.features.length;
if (removedIndoor > 0) {
  console.log(`  Removed ${removedIndoor} existing ground floor indoor map features`);
}

const poisBefore = buildingData.pois.features.length;
buildingData.pois.features = buildingData.pois.features.filter(
  feature => feature.properties.level_id !== 'G' && feature.properties.level_id !== 0
);
const removedPOIs = poisBefore - buildingData.pois.features.length;
if (removedPOIs > 0) {
  console.log(`  Removed ${removedPOIs} existing ground floor POI features`);
}

// Process relevant features for ground floor
const groundFloorIndoorFeatures = [];
const groundFloorPOIFeatures = [];

relevantFeatures.forEach((feature, index) => {
  const props = feature.properties;
  
  // Only extrude indoor rooms that are explicitly marked as rooms in Darnall Hall
  // Buildings are completely excluded from processing
  const shouldExtrude = props.indoor === 'room' && 
    (props.building_id === 'darnall' || props.name?.startsWith('G')) &&
    feature.geometry.type === 'Polygon';
  
  // Convert to indoor map feature
  const processedFeature = {
    ...feature,
    properties: {
      ...props,
      // Standardize level information
      level_id: props.level === '0' || props.level === 0 ? 'G' : (props.level || 'G'),
      level: props.level || '0',
      
      // Add required indoor properties
      alt_name: props.alt_name || null,
      category: props.indoor || props.amenity || null, // Remove building category
      restriction: props.restriction || null,
      accessibility: props.accessibility || null,
      display_point: props.display_point || null,
      feature_type: determineFeatureType(props, shouldExtrude),
      show: "true",
      area: 0,
      
      // Building properties for extrusion
      building_id: props.building_id || 'darnall',
      
      // Visual styling
      fill: determineColor(props, shouldExtrude),
      stroke: "#a6a5a2",
      "stroke-width": 1, // Standard stroke width for all features
      "stroke-opacity": 1,
      
      // Extrusion properties only for Darnall Hall rooms
      ...(shouldExtrude && {
        extrude: true,
        "extrude-height": 2.5 // Standard room height for Darnall Hall rooms
      })
    }
  };
  
  groundFloorIndoorFeatures.push(processedFeature);
});

function determineFeatureType(props, shouldExtrude) {
  // Only process indoor features and amenities - no buildings
  if (props.indoor === 'room' && shouldExtrude) return 'unit'; // Only extruded rooms are units
  if (props.indoor === 'room') return 'corridor'; // Non-extruded rooms are corridors  
  if (props.indoor === 'level') return 'level';
  if (props.indoor === 'wall') return 'wall';
  if (props.amenity) return 'unit';
  return 'corridor';
}

function determineColor(props, shouldExtrude) {
  if (props.indoor === 'room' || props.amenity) return "#f3f3f3";
  // Default corridor color for other indoor features
  return "#d6d5d1";
}

// Add ground floor features to building data
buildingData.indoor_map.features.push(...groundFloorIndoorFeatures);

console.log('✅ Merged ground floor data:');
console.log(`  Added ${groundFloorIndoorFeatures.length} indoor map features`);
console.log(`  Added ${groundFloorPOIFeatures.length} POI features`);

console.log('📊 Updated building data:');
console.log(`  Indoor map features: ${buildingData.indoor_map.features.length}`);
console.log(`  POI features: ${buildingData.pois.features.length}`);

// Write the updated building data back to file
try {
  fs.writeFileSync(buildingPath, JSON.stringify(buildingData, null, 2));
  console.log('✅ Successfully updated building.json');
} catch (error) {
  console.error('❌ Error writing building.json:', error.message);
  process.exit(1);
}

console.log('🎉 Ground floor data merged successfully!');
console.log('💡 The ground floor should now be visible in the app with extruded buildings.');
console.log('🏗️ Buildings will be extruded based on their building:levels tag or default heights.');
