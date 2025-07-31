#!/usr/bin/env node
/**
 * Add toilet POIs to the building data
 */

import fs from 'fs';

const buildingJsonPath = '/Users/kevin/Documents/GitHub/openindoormaps/app/mock/building.json';

console.log('📖 Reading current building.json...');
const buildingData = JSON.parse(fs.readFileSync(buildingJsonPath, 'utf8'));

console.log('🚽 Adding toilet POIs...');

// Find all toilet/bathroom features
const toiletFeatures = buildingData.indoor_map.features.filter(f => 
    f.properties.category === 'bathroom' && 
    f.properties.feature_type === 'unit' &&
    f.geometry.type === 'Polygon'
);

console.log(`🚽 Found ${toiletFeatures.length} toilet features`);

// Helper function to calculate polygon centroid
function calculateCentroid(coordinates) {
    let x = 0, y = 0;
    const points = coordinates[0]; // First ring (exterior)
    
    points.forEach(point => {
        x += point[0];
        y += point[1];
    });
    
    return [x / points.length, y / points.length];
}

// Get the current highest POI ID
let nextPOIId = Math.max(...buildingData.pois.features.map(p => p.properties.id)) + 1;

// Create toilet POIs
const toiletPOIs = [];

toiletFeatures.forEach((feature, index) => {
    const centroid = calculateCentroid(feature.geometry.coordinates);
    const floor = feature.properties.level_id;
    
    // Determine toilet type and accessibility
    const originalTags = feature.properties.original_tags || {};
    const isWheelchairAccessible = originalTags.wheelchair === 'yes';
    const access = originalTags.access || 'public';
    
    // Create a descriptive name
    let toiletName = `Restroom - Floor ${floor}`;
    if (isWheelchairAccessible) {
        toiletName += ' (Accessible)';
    }
    
    const toiletPOI = {
        type: 'Feature',
        geometry: {
            type: 'Point',
            coordinates: centroid
        },
        properties: {
            id: nextPOIId++,
            name: toiletName,
            type: 'restroom',
            floor: floor,
            metadata: {
                description: `Public restroom on floor ${floor}`,
                wheelchair_accessible: isWheelchairAccessible,
                access: access,
                amenity: 'toilets'
            },
            building_id: 'GU_DARNALL'
        }
    };
    
    toiletPOIs.push(toiletPOI);
});

console.log(`🚽 Generated ${toiletPOIs.length} toilet POIs`);

// Add toilet POIs to the building data
buildingData.pois.features.push(...toiletPOIs);

// Write updated file
fs.writeFileSync(buildingJsonPath, JSON.stringify(buildingData, null, 2));

console.log('✅ Successfully added toilet POIs!');
console.log('\n📊 Toilet POI Summary:');

// Group by floor for summary
const toiletsByFloor = toiletPOIs.reduce((acc, poi) => {
    const floor = poi.properties.floor;
    acc[floor] = (acc[floor] || 0) + 1;
    return acc;
}, {});

Object.keys(toiletsByFloor).sort().forEach(floor => {
    const accessibleCount = toiletPOIs.filter(p => 
        p.properties.floor === parseInt(floor) && 
        p.properties.metadata.wheelchair_accessible
    ).length;
    
    console.log(`  Floor ${floor}: ${toiletsByFloor[floor]} restrooms (${accessibleCount} accessible)`);
});

console.log(`\n🚽 Total: ${toiletPOIs.length} restroom POIs added`);
