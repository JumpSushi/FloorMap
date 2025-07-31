#!/usr/bin/env node
/**
 * Generate multi-floor data for Darnall Hall
 * Duplicates floor 5 data to create floors 1-6 with proper floor filtering
 */

import fs from 'fs';

const buildingJsonPath = '/Users/kevin/Documents/GitHub/openindoormaps/app/mock/building.json';

console.log('📖 Reading current building.json...');
const buildingData = JSON.parse(fs.readFileSync(buildingJsonPath, 'utf8'));

console.log('🏢 Generating multi-floor data for Darnall Hall...');

// Get existing floor 5 data as template
const floor5IndoorFeatures = buildingData.indoor_map.features.filter(f => f.properties.level_id === 5);
const floor5POIs = buildingData.pois.features.filter(f => f.properties.floor === 5);

console.log(`📐 Found ${floor5IndoorFeatures.length} indoor features on floor 5`);
console.log(`🚪 Found ${floor5POIs.length} POIs on floor 5`);

// Floors to generate (1-6, excluding 5 which already exists)
const floorsToGenerate = [1, 2, 3, 4, 6];

// Helper function to adjust room numbers for different floors
function adjustRoomNumber(originalNumber, floor) {
    // Convert room number like "505" to floor-specific number like "305" for floor 3
    if (originalNumber && originalNumber.length === 3) {
        return floor + originalNumber.substring(1);
    }
    return originalNumber;
}

// Helper function to adjust coordinates slightly for each floor (simulate different layouts)
function adjustCoordinates(coords, floor) {
    const floorOffset = (floor - 5) * 0.000002; // Small offset to distinguish floors
    if (Array.isArray(coords[0])) {
        // Polygon coordinates
        return coords.map(ring => 
            ring.map(coord => [coord[0] + floorOffset, coord[1] + floorOffset * 0.5])
        );
    } else {
        // Point coordinates
        return [coords[0] + floorOffset, coords[1] + floorOffset * 0.5];
    }
}

// Generate indoor features for each floor
const allIndoorFeatures = [...buildingData.indoor_map.features];

floorsToGenerate.forEach(floor => {
    console.log(`🔨 Generating floor ${floor}...`);
    
    floor5IndoorFeatures.forEach(feature => {
        const newFeature = JSON.parse(JSON.stringify(feature)); // Deep clone
        
        // Update floor-specific properties
        newFeature.properties.level_id = floor;
        
        // Update room numbers
        if (newFeature.properties.name) {
            newFeature.properties.name = adjustRoomNumber(newFeature.properties.name, floor);
        }
        
        // Update original tags if they exist
        if (newFeature.properties.original_tags) {
            newFeature.properties.original_tags.level = floor.toString();
            if (newFeature.properties.original_tags.name) {
                newFeature.properties.original_tags.name = adjustRoomNumber(newFeature.properties.original_tags.name, floor);
            }
        }
        
        // Slightly adjust coordinates to simulate different floor layouts
        newFeature.geometry.coordinates = adjustCoordinates(newFeature.geometry.coordinates, floor);
        
        allIndoorFeatures.push(newFeature);
    });
});

// Generate POIs for each floor
const allPOIs = [...buildingData.pois.features];
let nextPOIId = Math.max(...buildingData.pois.features.map(p => p.properties.id)) + 1;

floorsToGenerate.forEach(floor => {
    console.log(`🏷️ Generating POIs for floor ${floor}...`);
    
    floor5POIs.forEach(poi => {
        if (poi.properties.type === 'dorm_room') {
            const newPOI = JSON.parse(JSON.stringify(poi)); // Deep clone
            
            // Update POI properties
            newPOI.properties.id = nextPOIId++;
            newPOI.properties.floor = floor;
            
            // Update room number in name
            const originalRoomNumber = poi.properties.name.replace('Room ', '');
            const newRoomNumber = adjustRoomNumber(originalRoomNumber, floor);
            newPOI.properties.name = `Room ${newRoomNumber}`;
            
            // Update metadata
            newPOI.properties.metadata.level = floor;
            newPOI.properties.metadata.description = `Student dorm room in Darnall Hall - Floor ${floor}`;
            
            // Adjust coordinates slightly
            newPOI.geometry.coordinates = adjustCoordinates(newPOI.geometry.coordinates, floor);
            
            allPOIs.push(newPOI);
        }
    });
});

// Update building data
buildingData.indoor_map.features = allIndoorFeatures;
buildingData.pois.features = allPOIs;

console.log('🛤️ Generating routes for all floors...');

// Generate routes for all floors
const allRoutes = [];

// Generate routes for each floor
[1, 2, 3, 4, 5, 6].forEach(floor => {
    console.log(`🗺️ Creating navigation routes for floor ${floor}...`);
    
    // Get the building outline for this floor
    const buildingOutline = allIndoorFeatures.find(f => 
        f.properties.feature_type === 'corridor' && 
        f.properties.level_id === floor &&
        f.geometry.type === 'Polygon'
    );
    
    if (!buildingOutline) {
        console.warn(`⚠️ No building outline found for floor ${floor}`);
        return;
    }
    
    const buildingCoords = buildingOutline.geometry.coordinates[0];
    
    // Find bounding box
    let minLng = Infinity, maxLng = -Infinity;
    let minLat = Infinity, maxLat = -Infinity;
    
    buildingCoords.forEach(coord => {
        const [lng, lat] = coord;
        minLng = Math.min(minLng, lng);
        maxLng = Math.max(maxLng, lng);
        minLat = Math.min(minLat, lat);
        maxLat = Math.max(maxLat, lat);
    });
    
    // Create corridor network for this floor
    const centerLat = (minLat + maxLat) / 2;
    const centerLng = (minLng + maxLng) / 2;
    
    // Main horizontal corridor
    allRoutes.push({
        type: 'Feature',
        geometry: {
            type: 'LineString',
            coordinates: [
                [minLng + 0.00005, centerLat],
                [maxLng - 0.00005, centerLat]
            ]
        },
        properties: {
            level: floor,
            type: 'corridor'
        }
    });
    
    // Main vertical corridor
    allRoutes.push({
        type: 'Feature',
        geometry: {
            type: 'LineString',
            coordinates: [
                [centerLng, minLat + 0.00005],
                [centerLng, maxLat - 0.00005]
            ]
        },
        properties: {
            level: floor,
            type: 'corridor'
        }
    });
    
    // Connect room POIs to corridors
    const floorPOIs = allPOIs.filter(p => 
        p.properties.type === 'dorm_room' && 
        p.properties.floor === floor
    );
    
    floorPOIs.forEach(poi => {
        if (!poi.geometry.coordinates) return;
        
        const roomLng = poi.geometry.coordinates[0];
        const roomLat = poi.geometry.coordinates[1];
        const roomNumber = poi.properties.name.replace('Room ', '');
        
        // Connect to nearest corridor
        const distToHorizontal = Math.abs(roomLat - centerLat);
        const distToVertical = Math.abs(roomLng - centerLng);
        
        let connectionPath;
        
        if (distToHorizontal < distToVertical) {
            connectionPath = {
                type: 'Feature',
                geometry: {
                    type: 'LineString',
                    coordinates: [
                        [roomLng, centerLat],
                        [roomLng, roomLat]
                    ]
                },
                properties: {
                    level: floor,
                    type: 'room_connection',
                    room: roomNumber
                }
            };
        } else {
            connectionPath = {
                type: 'Feature',
                geometry: {
                    type: 'LineString',
                    coordinates: [
                        [centerLng, roomLat],
                        [roomLng, roomLat]
                    ]
                },
                properties: {
                    level: floor,
                    type: 'room_connection',
                    room: roomNumber
                }
            };
        }
        
        allRoutes.push(connectionPath);
    });
});

// Update indoor routes
buildingData.indoor_routes = {
    type: 'FeatureCollection',
    features: allRoutes
};

// Write updated file
fs.writeFileSync(buildingJsonPath, JSON.stringify(buildingData, null, 2));

console.log('✅ Successfully generated multi-floor data!');
console.log('\n📊 Summary:');
console.log(`  🏢 Floors: 1, 2, 3, 4, 5, 6`);
console.log(`  🗺️ Total indoor features: ${allIndoorFeatures.length}`);
console.log(`  🏷️ Total POIs: ${allPOIs.length}`);
console.log(`  🛤️ Total routes: ${allRoutes.length}`);

// Count by floor
[1, 2, 3, 4, 5, 6].forEach(floor => {
    const floorFeatures = allIndoorFeatures.filter(f => f.properties.level_id === floor).length;
    const floorPOIs = allPOIs.filter(p => p.properties.floor === floor && p.properties.type === 'dorm_room').length;
    const floorRoutes = allRoutes.filter(r => r.properties.level === floor).length;
    console.log(`    Floor ${floor}: ${floorFeatures} features, ${floorPOIs} room POIs, ${floorRoutes} routes`);
});

console.log('\n🚀 Multi-floor navigation ready!');
