#!/usr/bin/env node

import fs from 'fs';

/**
 * Find and snap route endpoints to the Reiss Exit/Entrance POI
 */
async function fixEntranceConnection() {
  console.log('🔧 Fixing indoor navigation connection to Reiss Exit/Entrance...');
  
  try {
    // Read building data
    const buildingData = JSON.parse(fs.readFileSync('./app/mock/building.json', 'utf8'));
    
    // Find the Reiss Exit/Entrance POI
    const entrancePOI = buildingData.pois.features.find(poi => 
      poi.properties.name === 'Reiss Exit/Entrance' && poi.properties.type === 'entrance'
    );
    
    if (!entrancePOI) {
      console.log('❌ Reiss Exit/Entrance POI not found');
      return;
    }
    
    const entranceCoord = entrancePOI.geometry.coordinates;
    console.log(`📍 Found entrance POI at: [${entranceCoord[0]}, ${entranceCoord[1]}]`);
    
    // Find room 103 POI to know where routes should connect from
    const room103POI = buildingData.pois.features.find(poi => 
      poi.properties.name && poi.properties.name.includes('103') && 
      poi.properties.building_id === 'reiss'
    );
    
    if (!room103POI) {
      console.log('❌ Room 103 POI not found');
      return;
    }
    
    const room103Coord = room103POI.geometry.coordinates;
    console.log(`📍 Found room 103 POI at: [${room103Coord[0]}, ${room103Coord[1]}]`);
    
    // Get all Reiss routes
    const reissRoutes = buildingData.indoor_routes.features.filter(route => 
      route.properties && route.properties.building === 'reiss'
    );
    
    console.log(`🛤️ Found ${reissRoutes.length} Reiss routes`);
    
    // Find routes that should connect room 103 to the entrance
    // Look for routes that start near room 103 or end near the entrance area
    let routesFixed = 0;
    
    reissRoutes.forEach((route, index) => {
      const coords = route.geometry.coordinates;
      if (!coords || coords.length < 2) return;
      
      const startCoord = coords[0];
      const endCoord = coords[coords.length - 1];
      
      // Calculate distances to room 103 and entrance
      const startDistToRoom103 = Math.sqrt(
        Math.pow(startCoord[0] - room103Coord[0], 2) + 
        Math.pow(startCoord[1] - room103Coord[1], 2)
      );
      
      const endDistToEntrance = Math.sqrt(
        Math.pow(endCoord[0] - entranceCoord[0], 2) + 
        Math.pow(endCoord[1] - entranceCoord[1], 2)
      );
      
      const startDistToEntrance = Math.sqrt(
        Math.pow(startCoord[0] - entranceCoord[0], 2) + 
        Math.pow(startCoord[1] - entranceCoord[1], 2)
      );
      
      const endDistToRoom103 = Math.sqrt(
        Math.pow(endCoord[0] - room103Coord[0], 2) + 
        Math.pow(endCoord[1] - room103Coord[1], 2)
      );
      
      // Tolerance of ~30 meters (0.0003 degrees roughly)
      const tolerance = 0.0003;
      
      // Check if this route connects room 103 area to entrance area
      const connectsRoom103ToEntrance = (
        (startDistToRoom103 < tolerance && endDistToEntrance < tolerance) ||
        (startDistToEntrance < tolerance && endDistToRoom103 < tolerance)
      );
      
      // Or check if route just ends near entrance (within reasonable distance)
      const endsNearEntrance = endDistToEntrance < tolerance;
      const startsNearEntrance = startDistToEntrance < tolerance;
      
      if (connectsRoom103ToEntrance || endsNearEntrance || startsNearEntrance) {
        console.log(`\n🔍 Route ${index + 1} connects to entrance area:`);
        console.log(`   Start: [${startCoord[0].toFixed(6)}, ${startCoord[1].toFixed(6)}]`);
        console.log(`   End:   [${endCoord[0].toFixed(6)}, ${endCoord[1].toFixed(6)}]`);
        console.log(`   Distance to entrance: ${endDistToEntrance.toFixed(6)}`);
        console.log(`   Type: ${route.properties.type || 'unknown'}`);
        
        // Snap the appropriate endpoint to the entrance
        if (endsNearEntrance) {
          console.log(`   🎯 Snapping END to entrance`);
          coords[coords.length - 1] = [...entranceCoord];
          routesFixed++;
        } else if (startsNearEntrance) {
          console.log(`   🎯 Snapping START to entrance`);
          coords[0] = [...entranceCoord];
          routesFixed++;
        }
      }
    });
    
    // If no routes were found near the entrance, create a new connection route
    if (routesFixed === 0) {
      console.log('\n❌ No existing routes found near entrance. Creating new connection route...');
      
      // Create a simple route from room 103 area to entrance
      const newRoute = {
        "type": "Feature",
        "geometry": {
          "type": "LineString",
          "coordinates": [
            [-77.073384, 38.909420],  // Near existing route endpoint
            [-77.073506, 38.909463],  // Intermediate point
            [...entranceCoord]        // Entrance POI coordinates
          ]
        },
        "properties": {
          "level": 0,
          "type": "room_connection",
          "building": "reiss",
          "room": "103"
        }
      };
      
      buildingData.indoor_routes.features.push(newRoute);
      console.log('✅ Added new route connecting to entrance');
      routesFixed = 1;
    }
    
    if (routesFixed > 0) {
      // Write updated building data
      fs.writeFileSync('./app/mock/building.json', JSON.stringify(buildingData, null, 2));
      console.log(`\n✅ Fixed ${routesFixed} route(s) to connect to entrance`);
      console.log('🎯 Indoor navigation should now work from room 103 to Reiss Exit/Entrance');
    } else {
      console.log('\n⚠️ No routes needed fixing');
    }
    
  } catch (error) {
    console.error('❌ Error fixing entrance connection:', error.message);
  }
}

fixEntranceConnection().catch(console.error);
