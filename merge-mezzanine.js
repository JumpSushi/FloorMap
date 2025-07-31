#!/usr/bin/env node

/**
 * Script to merge mezzanine floor data into building.json
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔄 Merging mezzanine floor data into building.json...');

// Read the main building data
const buildingPath = path.join(__dirname, 'app', 'mock', 'building.json');
const mezzaninePath = path.join(__dirname, 'mezzanine-floor.json');

if (!fs.existsSync(buildingPath)) {
  console.error('❌ building.json not found at:', buildingPath);
  process.exit(1);
}

if (!fs.existsSync(mezzaninePath)) {
  console.error('❌ mezzanine-floor.json not found at:', mezzaninePath);
  process.exit(1);
}

// Read and parse files
let buildingData;
let mezzanineData;

try {
  buildingData = JSON.parse(fs.readFileSync(buildingPath, 'utf8'));
  mezzanineData = JSON.parse(fs.readFileSync(mezzaninePath, 'utf8'));
} catch (error) {
  console.error('❌ Error parsing JSON files:', error.message);
  process.exit(1);
}

console.log('📊 Current building data:');
console.log(`  Indoor map features: ${buildingData.indoor_map.features.length}`);
console.log(`  POI features: ${buildingData.pois.features.length}`);

console.log('📊 Mezzanine floor data:');
console.log(`  Features: ${mezzanineData.features.length}`);

// Remove any existing mezzanine floor data from building.json
console.log('🗑️ Removing any existing mezzanine floor data...');
const indoorMapBefore = buildingData.indoor_map.features.length;
buildingData.indoor_map.features = buildingData.indoor_map.features.filter(
  feature => feature.properties.level_id !== 'M'
);
const removedIndoor = indoorMapBefore - buildingData.indoor_map.features.length;
if (removedIndoor > 0) {
  console.log(`  Removed ${removedIndoor} existing mezzanine indoor map features`);
}

const poisBefore = buildingData.pois.features.length;
buildingData.pois.features = buildingData.pois.features.filter(
  feature => feature.properties.level_id !== 'M'
);
const removedPOIs = poisBefore - buildingData.pois.features.length;
if (removedPOIs > 0) {
  console.log(`  Removed ${removedPOIs} existing mezzanine POI features`);
}

// Separate mezzanine features into indoor map features and POIs
const mezzanineIndoorFeatures = [];
const mezzaninePOIFeatures = [];

mezzanineData.features.forEach(feature => {
  // All features from mezzanine-floor.json should be indoor map features
  // POIs are only Point features for major landmarks, not amenities like toilets
  mezzanineIndoorFeatures.push({
    ...feature,
    properties: {
      ...feature.properties,
      // Ensure all required indoor properties are present
      alt_name: feature.properties.alt_name || null,
      category: feature.properties.category || feature.properties.indoor || null,
      restriction: feature.properties.restriction || null,
      accessibility: feature.properties.accessibility || null,
      display_point: feature.properties.display_point || null,
      feature_type: feature.properties.indoor === 'room' ? 'unit' : 
                   feature.properties.indoor === 'level' ? 'level' : 
                   feature.properties.amenity ? 'unit' : 'corridor',
      show: "true",
      area: 0,
      // Add visual styling for rooms and amenities
      fill: feature.properties.indoor === 'room' || feature.properties.amenity ? "#f3f3f3" : "#d6d5d1",
      stroke: "#a6a5a2",
      "stroke-width": 1,
      "stroke-opacity": 1
    }
  });
});

// Add mezzanine features to building data
buildingData.indoor_map.features.push(...mezzanineIndoorFeatures);
// No POI features to add since all mezzanine features are indoor map features

console.log('✅ Merged mezzanine floor data:');
console.log(`  Added ${mezzanineIndoorFeatures.length} indoor map features`);
console.log(`  Added 0 POI features (all mezzanine features are indoor map features)`);

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

console.log('🎉 Mezzanine floor data merged successfully!');
console.log('💡 The mezzanine floor should now be visible in the app when you select "Mezzanine" from the floor selector.');
