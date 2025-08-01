#!/usr/bin/env node

/**
 * Script to extract ground floor data from reissG.geojson and merge into building.json
 * Handles indoor features for Reiss Science Building
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔄 Processing Reiss ground floor GeoJSON and merging into building.json...');

// Read the files
const buildingPath = path.join(__dirname, 'app', 'mock', 'building.json');
const reissGroundFloorPath = path.join(__dirname, 'reissG.geojson');

if (!fs.existsSync(buildingPath)) {
  console.error('❌ building.json not found at:', buildingPath);
  process.exit(1);
}

if (!fs.existsSync(reissGroundFloorPath)) {
  console.error('❌ reissG.geojson not found at:', reissGroundFloorPath);
  process.exit(1);
}

// Read and parse files
let buildingData;
let reissGroundFloorData;

try {
  buildingData = JSON.parse(fs.readFileSync(buildingPath, 'utf8'));
  reissGroundFloorData = JSON.parse(fs.readFileSync(reissGroundFloorPath, 'utf8'));
} catch (error) {
  console.error('❌ Error parsing JSON files:', error.message);
  process.exit(1);
}

console.log('📊 Current building data:');
console.log(`  Indoor map features: ${buildingData.indoor_map.features.length}`);
console.log(`  POI features: ${buildingData.pois.features.length}`);

console.log('📊 Reiss ground floor GeoJSON data:');
console.log(`  Total features: ${reissGroundFloorData.features.length}`);

// Filter relevant features from Reiss ground floor data
const relevantFeatures = reissGroundFloorData.features.filter(feature => {
  const props = feature.properties;
  const tags = props.tags || {};
  
  // Include indoor features (rooms, corridors, levels, etc.)
  if (props.indoor || props.level !== undefined || tags.indoor || tags.level !== undefined) {
    return true;
  }
  
  // Include features with room names or educational purposes (but only if they have room properties)
  if (props.name && (props.room || tags.room)) {
    return true;
  }
  
  // Include doors and entrance features
  if (props.door || props.entrance || tags.door || tags.entrance) {
    return true;
  }
  
  // Include elevators (but not steps)
  if (props.highway && ['elevator'].includes(props.highway)) {
    return true;
  }
  
  // EXCLUDE buildings and outdoor features
  if (props.building || tags.building) {
    return false;
  }
  
  return false;
});

console.log(`📊 Relevant indoor features found: ${relevantFeatures.length}`);

// Remove any existing Reiss building data from building.json
console.log('🗑️ Removing any existing Reiss building data...');
const indoorMapBefore = buildingData.indoor_map.features.length;
buildingData.indoor_map.features = buildingData.indoor_map.features.filter(
  feature => feature.properties.building_id !== 'reiss'
);
const removedIndoor = indoorMapBefore - buildingData.indoor_map.features.length;
if (removedIndoor > 0) {
  console.log(`  Removed ${removedIndoor} existing Reiss indoor map features`);
}

const poisBefore = buildingData.pois.features.length;
buildingData.pois.features = buildingData.pois.features.filter(
  feature => feature.properties.building_id !== 'reiss'
);
const removedPOIs = poisBefore - buildingData.pois.features.length;
if (removedPOIs > 0) {
  console.log(`  Removed ${removedPOIs} existing Reiss POI features`);
}

// Process relevant features for Reiss ground floor
const reissGroundFloorIndoorFeatures = [];
const reissGroundFloorPOIFeatures = [];

// Function to calculate centroid of a polygon
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

// Get the next available POI ID
const existingPOIIds = buildingData.pois.features.map(poi => poi.properties.id);
const nextPOIId = Math.max(...existingPOIIds) + 1;
let currentPOIId = nextPOIId;

relevantFeatures.forEach((feature, index) => {
  const props = feature.properties;
  const tags = props.tags || {};
  
  // Determine if this should be extruded (rooms and amenities in Reiss building)
  const shouldExtrude = feature.geometry.type === 'Polygon' && (
    // Class rooms
    ((props.indoor === 'room' || tags.indoor === 'room') && 
     (props.room === 'class' || tags.room === 'class' || props.name)) ||
    // Bathrooms/toilets
    ((props.indoor === 'room' || tags.indoor === 'room') && 
     (props.room === 'bathroom' || tags.room === 'bathroom')) ||
    // Elevator rooms
    ((props.indoor === 'room' || tags.indoor === 'room') && 
     (props.room === 'elevator' || tags.room === 'elevator')) ||
    // Highway elevators (if they have polygon geometry)
    (props.highway === 'elevator' || tags.highway === 'elevator')
  );
  
  // Convert to indoor map feature
  const processedFeature = {
    ...feature,
    properties: {
      ...props,
      // Standardize level information
      level_id: props.level === '0' || props.level === 0 || tags.level === '0' ? 'G' : (props.level || tags.level || 'G'),
      level: props.level || tags.level || '0',
      
      // Add required indoor properties
      alt_name: props.alt_name || null,
      category: determineCategory(props, tags),
      // Override indoor property to show correct hover text
      indoor: determineIndoorType(props, tags),
      restriction: props.restriction || null,
      accessibility: props.accessibility || null,
      display_point: props.display_point || null,
      feature_type: determineFeatureType(props, tags, shouldExtrude),
      show: "true",
      area: 0,
      
      // Building properties for Reiss
      building_id: 'reiss',
      
      // Visual styling
      fill: determineColor(props, tags, shouldExtrude),
      stroke: "#a6a5a2",
      "stroke-width": 1,
      "stroke-opacity": 1,
      
      // Extrusion properties only for Reiss rooms
      ...(shouldExtrude && {
        extrude: true,
        "extrude-height": 2.5 // Standard room height for Reiss building rooms
      })
    }
  };
  
  reissGroundFloorIndoorFeatures.push(processedFeature);
  
  // Create POI for searchable rooms (classrooms, bathrooms, elevators with names)
  if (props.name && feature.geometry.type === 'Polygon' && shouldExtrude) {
    const centroid = getCentroid(feature.geometry.coordinates);
    const roomType = determineCategory(props, tags);
    const indoorType = determineIndoorType(props, tags);
    
    // Determine POI type for searchability
    let poiType = 'room';
    if (roomType === 'Classroom') poiType = 'classroom';
    else if (roomType === 'Bathroom') poiType = 'bathroom';
    else if (roomType === 'Elevator') poiType = 'elevator';
    
    const poiFeature = {
      type: 'Feature',
      geometry: {
        coordinates: centroid,
        type: 'Point'
      },
      properties: {
        id: currentPOIId++,
        name: `${indoorType} ${props.name}`,
        type: poiType,
        floor: 'G', // Ground floor matches the floor selector value
        metadata: {
          description: `${indoorType} ${props.name} in Reiss Science Building`,
          room_number: props.name,
          room_type: roomType.toLowerCase(),
          access: 'public'
        },
        building_id: 'reiss'
      }
    };
    
    reissGroundFloorPOIFeatures.push(poiFeature);
  }
});

function determineCategory(props, tags) {
  if (props.indoor || tags.indoor) {
    const indoor = props.indoor || tags.indoor;
    // For rooms, check the specific room type
    if (indoor === 'room') {
      const roomType = props.room || tags.room;
      if (roomType === 'class') return 'Classroom';
      if (roomType === 'bathroom') return 'Bathroom';
      if (roomType === 'elevator') return 'Elevator';
      return 'Room'; // fallback for other room types
    }
    return indoor;
  }
  if (props.amenity) return props.amenity;
  if (props.room || tags.room) {
    const room = props.room || tags.room;
    return room === 'class' ? 'Classroom' : room;
  }
  return null;
}

function determineIndoorType(props, tags) {
  if (props.indoor || tags.indoor) {
    const indoor = props.indoor || tags.indoor;
    // For rooms, check the specific room type to show correct hover text
    if (indoor === 'room') {
      const roomType = props.room || tags.room;
      if (roomType === 'class') return 'Classroom';
      if (roomType === 'bathroom') return 'Bathroom';
      if (roomType === 'elevator') return 'Elevator';
      return 'Room'; // fallback for other room types
    }
    return indoor;
  }
  return props.indoor || tags.indoor || null;
}

function determineFeatureType(props, tags, shouldExtrude) {
  // Process indoor features and amenities
  if ((props.indoor === 'room' || tags.indoor === 'room') && shouldExtrude) return 'unit';
  if (props.indoor === 'room' || tags.indoor === 'room') return 'corridor';
  if (props.indoor === 'level' || tags.indoor === 'level') return 'level';
  if (props.indoor === 'corridor' || tags.indoor === 'corridor') return 'corridor';
  if (props.indoor === 'wall' || tags.indoor === 'wall') return 'wall';
  if (props.amenity) return 'unit';
  if (props.highway === 'elevator' || tags.highway === 'elevator') return 'unit';
  if (props.door || tags.door) return 'corridor';
  return 'corridor';
}

function determineColor(props, tags, shouldExtrude) {
  if (props.indoor === 'room' || tags.indoor === 'room' || props.amenity) return "#f3f3f3";
  if (props.indoor === 'level' || tags.indoor === 'level') return "#e8e8e8";
  // Default corridor color for other indoor features
  return "#d6d5d1";
}

// Add Reiss ground floor features to building data
buildingData.indoor_map.features.push(...reissGroundFloorIndoorFeatures);
buildingData.pois.features.push(...reissGroundFloorPOIFeatures);

// Add building-level POI for Reiss Science Building (for information card)
const reissBuildingPOI = {
  type: 'Feature',
  geometry: {
    coordinates: [-77.073481865, 38.909408089], // Approximate center of Reiss building
    type: 'Point'
  },
  properties: {
    id: currentPOIId++,
    name: 'Reiss Science Building',
    type: 'academic_building',
    floor: 1, // Building-level POIs use floor 1
    metadata: {
      description: 'The Reiss Science Building contains classrooms, science labs, a nuclear accelerator vault and a greenhouse. The Blommer Science Library and the offices of the departments of biology, chemistry and physics are housed in the Reiss Science Building.'
    },
    building_id: 'reiss'
  }
};

buildingData.pois.features.push(reissBuildingPOI);

console.log('✅ Merged Reiss ground floor data:');
console.log(`  Added ${reissGroundFloorIndoorFeatures.length} indoor map features`);
console.log(`  Added ${reissGroundFloorPOIFeatures.length} room POI features`);
console.log(`  Added 1 building-level POI feature`);

console.log('📊 Updated building data:');
console.log(`  Indoor map features: ${buildingData.indoor_map.features.length}`);
console.log(`  POI features: ${buildingData.pois.features.length}`);

// Write the updated building data back to file
try {
  fs.writeFileSync(buildingPath, JSON.stringify(buildingData, null, 2));
  console.log('✅ Successfully updated building.json with Reiss building data');
} catch (error) {
  console.error('❌ Error writing building.json:', error.message);
  process.exit(1);
}

console.log('🎉 Reiss ground floor data merged successfully!');
console.log('💡 The Reiss building ground floor should now be visible in the app with extruded rooms.');
console.log('🏗️ Reiss building rooms will be extruded based on their room classification.');
console.log('🔍 Reiss classrooms, bathrooms, and elevators are now searchable as POIs in the discovery panel.');
console.log('🏢 Reiss Science Building now has a clickable building POI with information card.');
