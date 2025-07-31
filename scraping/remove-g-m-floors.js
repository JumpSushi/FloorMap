#!/usr/bin/env node
/**
 * Remove Ground (G) and Mezzanine (M) floor data
 * Keep only the basement (B) rename and floors 1-6
 */

import fs from 'fs';

const buildingJsonPath = '/Users/kevin/Documents/GitHub/openindoormaps/app/mock/building.json';

console.log('📖 Reading current building.json...');
const buildingData = JSON.parse(fs.readFileSync(buildingJsonPath, 'utf8'));

console.log('🗑️ Removing Ground (G) and Mezzanine (M) floor data...');

// Remove indoor map features for floors G and M
const originalIndoorFeatures = buildingData.indoor_map.features.length;
buildingData.indoor_map.features = buildingData.indoor_map.features.filter(feature => {
  const levelId = feature.properties?.level_id;
  return levelId !== 'G' && levelId !== 'M';
});
const removedIndoorFeatures = originalIndoorFeatures - buildingData.indoor_map.features.length;

// Remove POIs for floors G and M
const originalPOIs = buildingData.pois.features.length;
buildingData.pois.features = buildingData.pois.features.filter(poi => {
  const floor = poi.properties?.floor;
  return floor !== 'G' && floor !== 'M';
});
const removedPOIs = originalPOIs - buildingData.pois.features.length;

// Remove routes for floors G and M
const originalRoutes = buildingData.indoor_routes.features.length;
buildingData.indoor_routes.features = buildingData.indoor_routes.features.filter(route => {
  const level = route.properties?.level;
  return level !== 'G' && level !== 'M';
});
const removedRoutes = originalRoutes - buildingData.indoor_routes.features.length;

// Write updated file
fs.writeFileSync(buildingJsonPath, JSON.stringify(buildingData, null, 2));

console.log('✅ Successfully removed G and M floor data!');
console.log('\n📊 Removal Summary:');
console.log(`  🗺️ Indoor features removed: ${removedIndoorFeatures}`);
console.log(`  🏷️ POIs removed: ${removedPOIs}`);
console.log(`  🛤️ Routes removed: ${removedRoutes}`);

console.log('\n🏢 Remaining floor structure:');
console.log('  B  - Basement');
console.log('  1  - First floor');
console.log('  2  - Second floor');
console.log('  3  - Third floor');
console.log('  4  - Fourth floor');
console.log('  5  - Fifth floor');
console.log('  6  - Sixth floor');

console.log('\n📝 Note: Ground (G) and Mezzanine (M) floors removed, ready for custom floor plans.');
