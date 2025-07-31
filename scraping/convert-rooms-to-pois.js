#!/usr/bin/env node
/**
 * Convert Darnall Hall rooms to POIs for pathfinding integration
 */

import fs from 'fs';

const buildingJsonPath = '/Users/kevin/Documents/GitHub/openindoormaps/app/mock/building.json';

console.log('📖 Reading current building.json...');
const buildingData = JSON.parse(fs.readFileSync(buildingJsonPath, 'utf8'));

console.log('🏠 Converting rooms to POIs...');

// Extract room features from indoor_map
const roomFeatures = buildingData.indoor_map.features.filter(feature => {
    const props = feature.properties;
    return props.feature_type === 'unit' && 
           props.name && 
           props.level_id === 5 && // Focus on 5th floor for now
           feature.geometry.type === 'Polygon';
});

console.log(`Found ${roomFeatures.length} room features to convert to POIs`);

// Calculate centroid of a polygon
function getCentroid(coordinates) {
    const coords = coordinates[0]; // First ring of polygon
    let lat = 0, lng = 0;
    coords.forEach(coord => {
        lng += coord[0];
        lat += coord[1];
    });
    lat /= coords.length;
    lng /= coords.length;
    return [lng, lat];
}

// Convert rooms to POIs
const roomPOIs = roomFeatures.map((feature, index) => {
    const centroid = getCentroid(feature.geometry.coordinates);
    const roomName = feature.properties.name;
    const originalTags = feature.properties.original_tags || {};
    
    // Determine room type
    let roomType = 'dorm_room';
    if (originalTags.amenity === 'toilets') {
        roomType = 'bathroom';
    } else if (originalTags.shop === 'kitchen') {
        roomType = 'kitchen';
    } else if (originalTags.room === 'stairs') {
        roomType = 'stairs';
    } else if (originalTags.highway === 'elevator') {
        roomType = 'elevator';
    }
    
    return {
        type: 'Feature',
        geometry: {
            coordinates: centroid,
            type: 'Point'
        },
        properties: {
            id: 100 + index, // Start at 100 to avoid conflicts
            name: `Room ${roomName}`,
            type: roomType,
            floor: 5,
            metadata: {
                description: `${roomType === 'dorm_room' ? 'Student dorm room' : roomType} in Darnall Hall`,
                access: originalTags.access || 'private',
                level: 5
            },
            building_id: 'GU_DARNALL'
        }
    };
});

console.log(`📍 Generated ${roomPOIs.length} room POIs`);

// Keep only important campus POIs, remove generic classrooms
const importantPOIs = buildingData.pois.features.filter(poi => {
    const name = poi.properties.name.toLowerCase();
    const type = poi.properties.type;
    
    // Keep major buildings and facilities, remove generic classrooms
    return !name.includes('classroom') && 
           !name.includes('office') && 
           (type === 'library' || 
            type === 'academic_building' || 
            type === 'residence_hall' ||
            type === 'dining' ||
            type === 'athletic_facility' ||
            name.includes('healy') ||
            name.includes('lauinger') ||
            name.includes('darnall'));
});

console.log(`🏛️ Kept ${importantPOIs.length} important campus POIs`);

// Combine campus POIs with room POIs
const allPOIs = [...importantPOIs, ...roomPOIs];

console.log(`🎯 Total POIs: ${allPOIs.length}`);

// Update building data
buildingData.pois.features = allPOIs;

// Write updated file
fs.writeFileSync(buildingJsonPath, JSON.stringify(buildingData, null, 2));

console.log('✅ Successfully updated POIs!');
console.log('\n📊 POI Summary:');
console.log(`  • Campus buildings: ${importantPOIs.length}`);
console.log(`  • Darnall Hall rooms: ${roomPOIs.length}`);
console.log(`  • Total POIs: ${allPOIs.length}`);

console.log('\n🎯 Room POI Types:');
const roomTypes = {};
roomPOIs.forEach(poi => {
    const type = poi.properties.type;
    roomTypes[type] = (roomTypes[type] || 0) + 1;
});
Object.keys(roomTypes).forEach(type => {
    console.log(`  • ${type}: ${roomTypes[type]} rooms`);
});

console.log('\n🚀 Now rooms can be used with pathfinding!');
