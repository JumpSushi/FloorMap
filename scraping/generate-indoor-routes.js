#!/usr/bin/env node
/**
 * Generate proper indoor routes for Darnall Hall pathfinding
 */

import fs from 'fs';

const buildingJsonPath = '/Users/kevin/Documents/GitHub/openindoormaps/app/mock/building.json';

console.log('📖 Reading current building.json...');
const buildingData = JSON.parse(fs.readFileSync(buildingJsonPath, 'utf8'));

console.log('🛤️ Creating navigation routes for Darnall Hall...');

// Get the Darnall Hall building outline to create a corridor network
const darnallBuilding = buildingData.indoor_map.features.find(f => 
    f.properties.feature_type === 'corridor' && 
    f.properties.level_id === 5 &&
    f.geometry.type === 'Polygon'
);

if (!darnallBuilding) {
    console.error('❌ Could not find Darnall Hall building outline');
    process.exit(1);
}

// Extract the building perimeter coordinates
const buildingCoords = darnallBuilding.geometry.coordinates[0];
console.log(`🏢 Found building with ${buildingCoords.length} perimeter points`);

// Create a simplified navigation network inside the building
// This creates a rectangular grid of navigation paths

// Find bounding box of the building
let minLng = Infinity, maxLng = -Infinity;
let minLat = Infinity, maxLat = -Infinity;

buildingCoords.forEach(coord => {
    const [lng, lat] = coord;
    minLng = Math.min(minLng, lng);
    maxLng = Math.max(maxLng, lng);
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
});

console.log(`📐 Building bounds: [${minLng.toFixed(6)}, ${minLat.toFixed(6)}] to [${maxLng.toFixed(6)}, ${maxLat.toFixed(6)}]`);

// Create a simple corridor network
const corridorRoutes = [];

// Main horizontal corridor (center of building)
const centerLat = (minLat + maxLat) / 2;
const horizontalCorridor = {
    type: 'Feature',
    geometry: {
        type: 'LineString',
        coordinates: [
            [minLng + 0.00005, centerLat],  // Left side
            [maxLng - 0.00005, centerLat]   // Right side
        ]
    },
    properties: {
        level: 5,
        type: 'corridor'
    }
};
corridorRoutes.push(horizontalCorridor);

// Main vertical corridor (center of building)
const centerLng = (minLng + maxLng) / 2;
const verticalCorridor = {
    type: 'Feature',
    geometry: {
        type: 'LineString',
        coordinates: [
            [centerLng, minLat + 0.00005],  // Bottom
            [centerLng, maxLat - 0.00005]   // Top
        ]
    },
    properties: {
        level: 5,
        type: 'corridor'
    }
};
corridorRoutes.push(verticalCorridor);

// Add connection paths to room areas using POI coordinates
const roomPOIs = buildingData.pois.features.filter(f =>
    f.properties.type === 'dorm_room' && 
    f.properties.floor === 5
);

console.log(`🚪 Found ${roomPOIs.length} room POIs to connect`);

// Create connection paths from corridors to POI coordinates
roomPOIs.forEach(poi => {
    if (!poi.geometry.coordinates) return;
    
    // Use exact POI coordinates
    const roomLng = poi.geometry.coordinates[0];
    const roomLat = poi.geometry.coordinates[1];
    
    // Extract room number from POI name
    const roomNumber = poi.properties.name.replace('Room ', '');
    
    // Connect POI to nearest corridor point
    // Determine if POI is more aligned with horizontal or vertical corridor
    const distToHorizontal = Math.abs(roomLat - centerLat);
    const distToVertical = Math.abs(roomLng - centerLng);
    
    let connectionPath;
    
    if (distToHorizontal < distToVertical) {
        // Connect to horizontal corridor
        connectionPath = {
            type: 'Feature',
            geometry: {
                type: 'LineString',
                coordinates: [
                    [roomLng, centerLat],  // Corridor point
                    [roomLng, roomLat]     // POI coordinates
                ]
            },
            properties: {
                level: 5,
                type: 'room_connection',
                room: roomNumber
            }
        };
    } else {
        // Connect to vertical corridor
        connectionPath = {
            type: 'Feature',
            geometry: {
                type: 'LineString',
                coordinates: [
                    [centerLng, roomLat],  // Corridor point
                    [roomLng, roomLat]     // POI coordinates
                ]
            },
            properties: {
                level: 5,
                type: 'room_connection',
                room: roomNumber
            }
        };
    }
    
    corridorRoutes.push(connectionPath);
});

console.log(`🗺️ Generated ${corridorRoutes.length} navigation routes`);

// Update the indoor_routes in building data
buildingData.indoor_routes = {
    type: 'FeatureCollection',
    features: corridorRoutes
};

// Write updated file
fs.writeFileSync(buildingJsonPath, JSON.stringify(buildingData, null, 2));

console.log('✅ Successfully updated indoor routes!');
console.log('\n📊 Route Summary:');
console.log(`  • Main corridors: 2 (horizontal + vertical)`);
console.log(`  • Room connections: ${corridorRoutes.length - 2}`);
console.log(`  • Total routes: ${corridorRoutes.length}`);
console.log(`  • Coordinate system: Georgetown University (-77.07x, 38.91x)`);

console.log('\n🚀 Pathfinding should now work correctly for Darnall Hall!');
