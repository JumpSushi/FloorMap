#!/usr/bin/env node
/**
 * Process Darnall Hall GeoJSON for integration into OpenIndoorMaps
 */

import fs from 'fs';
import path from 'path';

// Read the Darnall Hall GeoJSON
const darnallGeoJsonPath = '/Users/kevin/Documents/GitHub/openindoormaps/scraping/Indoor GeoJSON.osminedit.geojson';
const buildingJsonPath = '/Users/kevin/Documents/GitHub/openindoormaps/app/mock/building.json';

console.log('📖 Reading Darnall Hall GeoJSON...');
const darnallData = JSON.parse(fs.readFileSync(darnallGeoJsonPath, 'utf8'));

console.log('📖 Reading current building.json...');
const buildingData = JSON.parse(fs.readFileSync(buildingJsonPath, 'utf8'));

// Filter for Darnall Hall features (indoor features only)
const darnallIndoorFeatures = darnallData.features.filter(feature => {
    const props = feature.properties;
    
    // Keep features that are:
    // 1. Indoor features (have level property)
    // 2. Building outline with specific level information
    // 3. Rooms, corridors, elevators, stairs, etc.
    
    if (props.level || props.tags?.level || props.tags?.indoor) {
        return true;
    }
    
    // Keep the building outline
    if (props.tags?.building === 'university' && props.tags?.name === 'Darnall Hall') {
        return true;
    }
    
    return false;
});

console.log(`🏢 Found ${darnallIndoorFeatures.length} indoor features for Darnall Hall`);

// Process features to ensure proper OpenIndoorMaps format
const processedFeatures = darnallIndoorFeatures.map((feature, index) => {
    const props = feature.properties;
    
    // Extract level information
    let level = 1; // default
    if (props.level) {
        level = parseInt(props.level);
    } else if (props.tags?.level) {
        level = parseInt(props.tags.level);
    }
    
    // Determine feature type
    let feature_type = 'room';
    if (props.tags?.indoor === 'level') {
        feature_type = 'level';
    } else if (props.tags?.indoor === 'room') {
        feature_type = 'room';
    } else if (props.tags?.highway === 'elevator') {
        feature_type = 'elevator';
    } else if (props.tags?.room === 'stairs') {
        feature_type = 'stairs';
    } else if (props.tags?.amenity === 'toilets') {
        feature_type = 'bathroom';
    } else if (props.tags?.shop === 'kitchen') {
        feature_type = 'kitchen';
    } else if (props.tags?.building === 'university') {
        feature_type = 'building';
    }
    
    // Extract name
    let name = '';
    if (props.tags?.name) {
        name = props.tags.name;
    } else if (props.name) {
        name = props.name;
    }
    
    return {
        type: 'Feature',
        properties: {
            name: name || null,
            alt_name: null,
            category: feature_type,
            restriction: props.tags?.access || null,
            accessibility: props.tags?.wheelchair || null,
            display_point: null,
            feature_type: feature_type,
            level_id: level.toString(),
            show: 'true',
            area: 0,
            // Keep original properties for reference
            original_tags: props.tags || {},
            original_id: props.id || feature.id
        },
        geometry: feature.geometry
    };
});

console.log('🔄 Processing features by level...');

// Group features by level
const featuresByLevel = {};
processedFeatures.forEach(feature => {
    const level = feature.properties.level_id;
    if (!featuresByLevel[level]) {
        featuresByLevel[level] = [];
    }
    featuresByLevel[level].push(feature);
});

console.log('📊 Features by level:');
Object.keys(featuresByLevel).forEach(level => {
    console.log(`  Level ${level}: ${featuresByLevel[level].length} features`);
});

// Update building.json
console.log('🔧 Updating building.json...');

// Replace indoor_map features with Darnall Hall data
buildingData.indoor_map.features = processedFeatures;

// Update Darnall Hall POI coordinates to match the building centroid
const darnallBuilding = processedFeatures.find(f => f.properties.feature_type === 'building');
if (darnallBuilding && darnallBuilding.geometry.type === 'Polygon') {
    // Calculate centroid of the building polygon
    const coords = darnallBuilding.geometry.coordinates[0];
    let lat = 0, lng = 0;
    coords.forEach(coord => {
        lng += coord[0];
        lat += coord[1];
    });
    lat /= coords.length;
    lng /= coords.length;
    
    // Update Darnall Hall POI
    const darnallPoi = buildingData.pois.features.find(poi => poi.properties.name === 'Darnall Hall');
    if (darnallPoi) {
        darnallPoi.geometry.coordinates = [lng, lat];
        darnallPoi.properties.metadata.description = 'Student residence hall with detailed floor plans available';
        console.log(`📍 Updated Darnall Hall POI coordinates to [${lng.toFixed(6)}, ${lat.toFixed(6)}]`);
    }
}

// Write updated building.json
fs.writeFileSync(buildingJsonPath, JSON.stringify(buildingData, null, 2));

console.log('✅ Successfully updated building.json with Darnall Hall indoor mapping data!');
console.log(`📁 Updated file: ${buildingJsonPath}`);
console.log(`🏢 Added ${processedFeatures.length} indoor features`);
console.log('🎯 Features include:');
console.log('   • Individual dorm rooms (501-528)');
console.log('   • Bathrooms and shared facilities');
console.log('   • Elevators and stairwells');
console.log('   • Kitchen and common areas');
console.log('   • Multi-level building structure');

console.log('\n🚀 Next steps:');
console.log('1. Start your development server: npm run dev');
console.log('2. Navigate to Darnall Hall on the map');
console.log('3. Use the floor selector to view different levels');
console.log('4. Explore the detailed room layouts!');
