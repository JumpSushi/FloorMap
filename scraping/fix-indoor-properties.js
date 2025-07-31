#!/usr/bin/env node
/**
 * Fix Darnall Hall GeoJSON properties for proper indoor mapping display
 */

import fs from 'fs';

const buildingJsonPath = '/Users/kevin/Documents/GitHub/openindoormaps/app/mock/building.json';

console.log('📖 Reading current building.json...');
const buildingData = JSON.parse(fs.readFileSync(buildingJsonPath, 'utf8'));

console.log('🔧 Fixing indoor map feature properties...');

// Fix the indoor map features
const fixedFeatures = buildingData.indoor_map.features.map(feature => {
    const props = feature.properties;
    
    // Convert level_id from string to number (required by setFloorLevel)
    let level_id = null;
    if (props.level_id && props.level_id !== "null") {
        const parsed = parseInt(props.level_id);
        if (!isNaN(parsed)) {
            level_id = parsed;
        }
    }
    
    // Map feature types to the expected values
    let feature_type = props.feature_type;
    if (props.feature_type === 'room' || props.feature_type === 'bathroom' || props.feature_type === 'kitchen') {
        feature_type = 'unit';  // Rooms become units for extrusion
    } else if (props.feature_type === 'building') {
        feature_type = 'corridor';  // Building outline becomes corridor
    } else if (props.feature_type === 'level') {
        feature_type = 'corridor';  // Level outlines become corridor
    } else if (props.feature_type === 'stairs' || props.feature_type === 'elevator') {
        feature_type = 'unit';  // Infrastructure becomes units
    }
    
    // Keep only polygons for indoor mapping (points like elevators won't render properly)
    if (feature.geometry.type !== 'Polygon') {
        return null;  // Skip non-polygon features
    }
    
    return {
        ...feature,
        properties: {
            ...props,
            level_id: level_id,  // Convert to number
            feature_type: feature_type,  // Map to expected values
            // Add additional properties for styling
            fill: feature_type === 'unit' ? '#f3f3f3' : '#d6d5d1',
            stroke: '#a6a5a2',
            'stroke-width': 1,
            'stroke-opacity': 1
        }
    };
}).filter(Boolean);  // Remove null entries

console.log(`🏠 Processed ${fixedFeatures.length} indoor features`);

// Group by level for debugging
const featuresByLevel = {};
fixedFeatures.forEach(feature => {
    const level = feature.properties.level_id || 'null';
    if (!featuresByLevel[level]) {
        featuresByLevel[level] = [];
    }
    featuresByLevel[level].push(feature);
});

console.log('📊 Features by level:');
Object.keys(featuresByLevel).sort().forEach(level => {
    const features = featuresByLevel[level];
    const units = features.filter(f => f.properties.feature_type === 'unit').length;
    const corridors = features.filter(f => f.properties.feature_type === 'corridor').length;
    console.log(`  Level ${level}: ${features.length} total (${units} units, ${corridors} corridors)`);
});

// Update the building data
buildingData.indoor_map.features = fixedFeatures;

// Write the updated file
fs.writeFileSync(buildingJsonPath, JSON.stringify(buildingData, null, 2));

console.log('✅ Successfully fixed indoor map properties!');
console.log('\n🎯 Key fixes applied:');
console.log('  • Converted level_id from strings to numbers');
console.log('  • Mapped feature_type to "unit" and "corridor"');
console.log('  • Removed non-polygon features (points)');
console.log('  • Added proper styling properties');
console.log('\n🚀 Now reload your browser to see the indoor mapping!');
