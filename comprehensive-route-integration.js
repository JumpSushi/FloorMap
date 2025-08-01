#!/usr/bin/env node

import fs from 'fs';
import readline from 'readline';

/**
 * Comprehensive Route Integration Script
 * Provides full control over integrating manual routes into the navigation system
 */

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function comprehensiveRouteIntegration() {
  console.log('🚀 Comprehensive Route Integration Script');
  console.log('==========================================\n');

  try {
    // Step 1: Check what files are available
    console.log('📁 Step 1: Checking available route files...');
    
    const routeFiles = [];
    if (fs.existsSync('./Reiss Building Routes (13).json')) {
      routeFiles.push('./Reiss Building Routes (13).json');
    }
    if (fs.existsSync('./test-routes-with-exit.json')) {
      routeFiles.push('./test-routes-with-exit.json');
    }
    
    // Check for other potential route files
    const files = fs.readdirSync('./');
    const potentialRouteFiles = files.filter(file => 
      file.toLowerCase().includes('route') && file.endsWith('.json')
    );
    
    console.log(`   Found route files: ${routeFiles.length > 0 ? routeFiles.join(', ') : 'None'}`);
    console.log(`   Other potential files: ${potentialRouteFiles.filter(f => !routeFiles.includes(f)).join(', ') || 'None'}\n`);

    if (routeFiles.length === 0) {
      console.log('❌ No route files found. Please ensure you have manual route files to integrate.');
      rl.close();
      return;
    }

    // Step 2: Read building data and analyze current state
    console.log('📊 Step 2: Analyzing current building data...');
    const buildingData = JSON.parse(fs.readFileSync('./app/mock/building.json', 'utf8'));
    
    const totalRoutes = buildingData.indoor_routes.features.length;
    const reissRoutes = buildingData.indoor_routes.features.filter(route => 
      route.properties?.building === 'reiss'
    );
    
    console.log(`   Total routes in system: ${totalRoutes}`);
    console.log(`   Current Reiss routes: ${reissRoutes.length}`);
    
    // Analyze POIs
    const reissPois = buildingData.pois.features.filter(poi => 
      poi.properties?.building === 'reiss'
    );
    console.log(`   Reiss POIs: ${reissPois.length}\n`);

    // Step 3: Ask about previous routes
    console.log('🗑️  Step 3: Handle existing routes');
    const deletePrevious = await question(
      `Do you want to DELETE ${reissRoutes.length} existing Reiss routes? (y/N): `
    );
    
    const shouldDeletePrevious = deletePrevious.toLowerCase() === 'y' || deletePrevious.toLowerCase() === 'yes';
    console.log(`   ${shouldDeletePrevious ? '✅ Will delete' : '❌ Will keep'} existing routes\n`);

    // Step 4: Choose route file to integrate
    console.log('📥 Step 4: Select route file to integrate');
    let selectedFile = routeFiles[0];
    
    if (routeFiles.length > 1) {
      console.log('   Available files:');
      routeFiles.forEach((file, index) => {
        console.log(`   ${index + 1}. ${file}`);
      });
      
      const choice = await question('   Select file number (or press Enter for first): ');
      const fileIndex = parseInt(choice) - 1;
      if (fileIndex >= 0 && fileIndex < routeFiles.length) {
        selectedFile = routeFiles[fileIndex];
      }
    }
    
    console.log(`   Selected: ${selectedFile}\n`);

    // Step 5: Load and validate new routes
    console.log('🔍 Step 5: Loading and validating new routes...');
    const newRoutes = JSON.parse(fs.readFileSync(selectedFile, 'utf8'));
    console.log(`   Loaded ${newRoutes.length} routes from ${selectedFile}`);
    
    // Separate regular routes from exit connections
    const regularRoutes = newRoutes.filter(route => 
      route.properties?.type !== 'exit_connection'
    );
    const exitConnections = newRoutes.filter(route => 
      route.properties?.type === 'exit_connection'
    );
    
    console.log(`   Regular routes: ${regularRoutes.length}`);
    console.log(`   Exit connections: ${exitConnections.length}`);
    
    // Validate routes
    let validRoutes = 0;
    newRoutes.forEach((route, index) => {
      if (route.type === 'Feature' && 
          route.geometry?.type === 'LineString' && 
          Array.isArray(route.geometry.coordinates)) {
        validRoutes++;
      } else {
        console.log(`   ⚠️  Route ${index + 1} has invalid format`);
      }
    });
    
    console.log(`   Valid routes: ${validRoutes}/${newRoutes.length}\n`);

    // Step 6: Ask about route endpoint handling
    console.log('🎯 Step 6: Route endpoint configuration');
    const endpointChoice = await question(
      'How should route endpoints be handled?\n' +
      '  1. Connect directly to POI centers (recommended for navigation)\n' +
      '  2. Keep original endpoints (manual positions)\n' +
      '  3. Ask me to choose for each route\n' +
      'Choice (1-3): '
    );
    
    const endpointMode = parseInt(endpointChoice) || 1;
    console.log(`   Selected: ${endpointMode === 1 ? 'POI centers' : endpointMode === 2 ? 'Original endpoints' : 'Interactive mode'}\n`);

    // Step 6b: Handle exit connections
    if (exitConnections.length > 0) {
      console.log('🚪 Step 6b: Exit connection handling');
      
      // Check if exit POI already exists
      const existingExitPOI = buildingData.pois.features.find(poi => 
        poi.properties?.building === 'reiss' && (poi.properties?.type === 'exit' || poi.properties?.type === 'entrance')
      );
      
      if (existingExitPOI) {
        console.log(`   📍 Exit POI already exists: ${existingExitPOI.properties.name}`);
        console.log(`   🔄 Will use existing exit POI for endpoint snapping\n`);
      } else {
        const createExitPOI = await question(
          `Found ${exitConnections.length} exit connection(s). Create "Reiss Exit/Entrance" POI? (Y/n): `
        );
        
        const shouldCreateExitPOI = createExitPOI.toLowerCase() !== 'n' && createExitPOI.toLowerCase() !== 'no';
        console.log(`   ${shouldCreateExitPOI ? '✅ Will create' : '❌ Will skip'} exit POI\n`);
        
        if (shouldCreateExitPOI && exitConnections.length > 0) {
          // Create exit POI at the end of the first exit connection
          const exitConnection = exitConnections[0];
          const exitCoords = exitConnection.geometry.coordinates;
          const exitEndpoint = exitCoords[exitCoords.length - 1];
          
          const exitPOI = {
            type: "Feature",
            id: "reiss-exit-entrance",
            geometry: {
              type: "Point",
              coordinates: [-77.07360623, 38.90946303]
            },
            properties: {
              id: "reiss-exit-entrance",
              name: "Reiss Exit/Entrance",
              type: "entrance",
              category: "building",
              building: "reiss",
              floor: "0",
              description: "Main exit/entrance for Reiss Science Building",
              access: "public",
              level: 0,
              show: "true",
              fill: "#22c55e",
              stroke: "#16a34a",
              "stroke-width": 2,
              "stroke-opacity": 1
            },
            building_id: "reiss"
          };
          
          // Add exit POI to building data
          buildingData.pois.features.push(exitPOI);
          reissPois.push(exitPOI); // Add to our local array too
          
          console.log(`   🚪 Created exit POI at: [${exitEndpoint[0].toFixed(6)}, ${exitEndpoint[1].toFixed(6)}]`);
        }
      }
    }

    // Step 7: Integration preview
    console.log('📋 Step 7: Integration preview');
    console.log('   Actions to perform:');
    console.log(`   ${shouldDeletePrevious ? '🗑️' : '📌'} ${shouldDeletePrevious ? 'Remove' : 'Keep'} ${reissRoutes.length} existing Reiss routes`);
    console.log(`   ➕ Add ${validRoutes} new routes from ${selectedFile}`);
    console.log(`   🎯 Endpoint mode: ${endpointMode === 1 ? 'POI centers' : endpointMode === 2 ? 'Original' : 'Interactive'}`);
    console.log(`   📊 Final total: ${totalRoutes + (shouldDeletePrevious ? -reissRoutes.length : 0) + validRoutes} routes\n`);

    const confirm = await question('Proceed with integration? (Y/n): ');
    if (confirm.toLowerCase() === 'n' || confirm.toLowerCase() === 'no') {
      console.log('❌ Integration cancelled.');
      rl.close();
      return;
    }

    // Step 8: Perform integration
    console.log('\n🔧 Step 8: Performing integration...');
    
    // Remove existing Reiss routes if requested
    if (shouldDeletePrevious) {
      const nonReissRoutes = buildingData.indoor_routes.features.filter(route => 
        route.properties?.building !== 'reiss'
      );
      buildingData.indoor_routes.features = nonReissRoutes;
      console.log(`   🗑️ Removed ${reissRoutes.length} existing Reiss routes`);
    }

    // Add new routes
    const routesToAdd = [...newRoutes];
    buildingData.indoor_routes.features.push(...routesToAdd);
    console.log(`   ➕ Added ${routesToAdd.length} new routes`);

    // Handle endpoints if needed
    if (endpointMode === 1) {
      console.log('   🎯 Snapping endpoints to POI centers...');
      
      // Get all Reiss routes (including newly added ones, but excluding exit connections for now)
      const allReissRoutes = buildingData.indoor_routes.features.filter(route => 
        route.properties?.building === 'reiss' && route.properties?.type !== 'exit_connection'
      );

      console.log(`   📍 Found ${reissPois.length} POI coordinates`);
      console.log(`   🛤️ Processing ${allReissRoutes.length} routes for endpoint snapping`);

      let snappedCount = 0;

      allReissRoutes.forEach((route, routeIndex) => {
        const coords = route.geometry.coordinates;
        const startCoord = coords[0];
        const endCoord = coords[coords.length - 1];
        
        let routeModified = false;

        // Check start point - find closest POI within reasonable distance
        let closestStartPOI = null;
        let minStartDistance = Infinity;

        reissPois.forEach(poi => {
          const poiCoord = poi.geometry.coordinates;
          const distance = Math.sqrt(
            Math.pow(startCoord[0] - poiCoord[0], 2) + 
            Math.pow(startCoord[1] - poiCoord[1], 2)
          );
          
          if (distance < minStartDistance) {
            minStartDistance = distance;
            closestStartPOI = poi;
          }
        });

        // Snap start if close enough (within ~30 meters in coordinate space)
        if (minStartDistance < 0.0003) {
          console.log(`   🎯 Route ${routeIndex + 1}: Snapping START to Room ${closestStartPOI.properties.name}`);
          coords[0] = [...closestStartPOI.geometry.coordinates];
          routeModified = true;
        }

        // Check end point - find closest POI within reasonable distance
        let closestEndPOI = null;
        let minEndDistance = Infinity;

        reissPois.forEach(poi => {
          const poiCoord = poi.geometry.coordinates;
          const distance = Math.sqrt(
            Math.pow(endCoord[0] - poiCoord[0], 2) + 
            Math.pow(endCoord[1] - poiCoord[1], 2)
          );
          
          if (distance < minEndDistance) {
            minEndDistance = distance;
            closestEndPOI = poi;
          }
        });

        // Snap end if close enough
        if (minEndDistance < 0.0003) {
          console.log(`   🎯 Route ${routeIndex + 1}: Snapping END to Room ${closestEndPOI.properties.name}`);
          coords[coords.length - 1] = [...closestEndPOI.geometry.coordinates];
          routeModified = true;
        }

        if (routeModified) {
          snappedCount++;
        }
      });

      // Handle exit connections separately
      const allExitConnections = buildingData.indoor_routes.features.filter(route => 
        route.properties?.building === 'reiss' && route.properties?.type === 'exit_connection'
      );

      if (allExitConnections.length > 0) {
        console.log(`   🚪 Processing ${allExitConnections.length} exit connections for endpoint snapping`);
        
        allExitConnections.forEach((route, routeIndex) => {
          const coords = route.geometry.coordinates;
          const startCoord = coords[0];
          const endCoord = coords[coords.length - 1];
          
          let routeModified = false;

          // Snap start to closest room POI (excluding exit POI)
          const roomPOIs = reissPois.filter(poi => poi.properties?.type !== 'exit' && poi.properties?.type !== 'entrance');
          let closestStartPOI = null;
          let minStartDistance = Infinity;

          roomPOIs.forEach(poi => {
            const poiCoord = poi.geometry.coordinates;
            const distance = Math.sqrt(
              Math.pow(startCoord[0] - poiCoord[0], 2) + 
              Math.pow(startCoord[1] - poiCoord[1], 2)
            );
            
            if (distance < minStartDistance) {
              minStartDistance = distance;
              closestStartPOI = poi;
            }
          });

          if (minStartDistance < 0.0003 && closestStartPOI) {
            console.log(`   🎯 Exit ${routeIndex + 1}: Snapping START to Room ${closestStartPOI.properties.name}`);
            coords[0] = [...closestStartPOI.geometry.coordinates];
            routeModified = true;
          }

          // Snap end to exit POI if it exists
          const exitPOI = reissPois.find(poi => poi.properties?.type === 'exit' || poi.properties?.type === 'entrance');
          if (exitPOI) {
            console.log(`   🎯 Exit ${routeIndex + 1}: Snapping END to ${exitPOI.properties.name}`);
            coords[coords.length - 1] = [...exitPOI.geometry.coordinates];
            routeModified = true;
          }

          if (routeModified) {
            snappedCount++;
          }
        });
      }

      console.log(`   ✅ Snapped ${snappedCount} routes to POI coordinates`);
    }

    // Step 9: Create backup and save
    console.log('\n💾 Step 9: Saving results...');
    
    // Create backup
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = `./app/mock/building.json.backup.${timestamp}`;
    fs.copyFileSync('./app/mock/building.json', backupFile);
    console.log(`   📦 Created backup: ${backupFile}`);
    
    // Save updated building data
    fs.writeFileSync('./app/mock/building.json', JSON.stringify(buildingData, null, 2));
    console.log(`   💾 Updated building.json`);

    // Step 10: Summary and next steps
    console.log('\n✅ Integration completed successfully!');
    console.log('==========================================');
    console.log(`📊 Final statistics:`);
    console.log(`   Total routes: ${buildingData.indoor_routes.features.length}`);
    console.log(`   Reiss routes: ${buildingData.indoor_routes.features.filter(r => r.properties?.building === 'reiss').length}`);
    const exitConnectionCount = buildingData.indoor_routes.features.filter(r => 
      r.properties?.building === 'reiss' && r.properties?.type === 'exit_connection'
    ).length;
    console.log(`   Exit connections: ${exitConnectionCount}`);
    console.log(`   Reiss POIs: ${buildingData.pois.features.filter(p => p.properties?.building === 'reiss').length}`);
    
    console.log('\n🔧 Recommended next steps:');
    if (endpointMode === 1) {
      console.log('   ✅ Endpoint snapping completed automatically');
      console.log('   1. Run: node verify-route-data.js');
      console.log('   2. Test navigation in the UI');
    } else {
      console.log('   1. Run: node smart-endpoint-snapping.js (if you want to snap endpoints later)');
      console.log('   2. Run: node verify-route-data.js');
      console.log('   3. Test navigation in the UI');
    }
    
    console.log('\n🚀 Routes are ready for use!');

  } catch (error) {
    console.error('❌ Error during integration:', error.message);
    process.exit(1);
  } finally {
    rl.close();
  }
}

comprehensiveRouteIntegration().catch(console.error);
