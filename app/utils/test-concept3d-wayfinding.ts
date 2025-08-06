/**
 * Test file to validate Concept3D wayfinding integration
 * 
 * This file demonstrates how to use the new Concept3D wayfinding service
 * and can be used for testing the integration.
 */

import Concept3DWayfindingService from '../services/concept3d-wayfinding';
import config from '../config';

// Example coordinates from the provided API example
const FROM_COORD: [number, number] = [-77.068962, 38.907677]; // [lng, lat]
const TO_COORD: [number, number] = [-77.073502, 38.909557];   // [lng, lat]

/**
 * Test the Concept3D wayfinding service
 */
export async function testConcept3DWayfinding() {
  console.log('🧪 Testing Concept3D Wayfinding Service');
  
  try {
    // Initialize the service with configuration
    const service = new Concept3DWayfindingService({
      map: config.concept3d.mapId,
      key: config.concept3d.apiKey,
      stamp: config.concept3d.defaultStamp
    });

    console.log('📍 Getting directions from', FROM_COORD, 'to', TO_COORD);
    
    // Get directions
    const route = await service.getDirections(FROM_COORD, TO_COORD, {
      mode: 'walking'
    });

    console.log('✅ Route received successfully!');
    console.log('📊 Route summary:', {
      distance: route.distance,
      duration: route.duration,
      formattedDuration: route.formattedDuration,
      provider: route.provider,
      segments: route.route.length,
      pathPoints: route.fullPath.length
    });

    // Test conversion to GeoJSON
    const geoJson = service.routeToGeoJSON(route);
    console.log('🗺️ GeoJSON conversion:', {
      type: geoJson.type,
      coordinateCount: geoJson.coordinates.length,
      firstCoord: geoJson.coordinates[0],
      lastCoord: geoJson.coordinates[geoJson.coordinates.length - 1]
    });

    // Test turn-by-turn instructions
    const instructions = service.getInstructions(route);
    console.log('📋 Turn-by-turn instructions:');
    instructions.forEach((instruction, index) => {
      console.log(`  ${index + 1}. ${instruction}`);
    });

    // Test OSM format conversion
    const osmFormat = service.routeToOSMFormat(route);
    console.log('🔄 OSM format conversion:', {
      distance: osmFormat.distance,
      duration: osmFormat.duration,
      legs: osmFormat.legs.length,
      geometryType: osmFormat.geometry.type,
      coordinateCount: osmFormat.geometry.coordinates.length
    });

    return {
      success: true,
      route,
      geoJson,
      instructions,
      osmFormat
    };

  } catch (error) {
    console.error('❌ Test failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Test the integration with CrossBuildingNavigationService
 */
export async function testConcept3DIntegration() {
  console.log('🧪 Testing Concept3D integration with CrossBuildingNavigationService');
  
  try {
    // This would normally be done through the useEnhancedDirections hook
    // but we can test the service directly here
    
    const CrossBuildingNavigationService = (await import('../services/cross-building-navigation')).default;
    
    // Create a mock indoor directions instance for testing
    const mockIndoorDirections = {
      clear: () => console.log('Mock: cleared indoor directions'),
      setWaypoints: (waypoints: [number, number][]) => 
        console.log('Mock: set waypoints', waypoints)
    };

    const service = new CrossBuildingNavigationService(
      config.routingApi, 
      mockIndoorDirections
    );

    console.log('📍 Testing cross-building navigation with Concept3D backend');
    
    // Test outdoor route (should use Concept3D as primary)
    const route = await service.findCrossBuildingRoute(FROM_COORD, TO_COORD);
    
    console.log('✅ Cross-building route generated:', {
      hasOutdoor: !!route.outdoor,
      hasIndoor: !!(route.indoor.start || route.indoor.end),
      totalDistance: route.totalDistance,
      totalDuration: route.totalDuration,
      instructions: route.instructions.length
    });

    return {
      success: true,
      route
    };

  } catch (error) {
    console.error('❌ Integration test failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Run all tests
 */
export async function runAllTests() {
  console.log('🚀 Running all Concept3D wayfinding tests...\n');

  const results = {
    concept3dService: await testConcept3DWayfinding(),
    integration: await testConcept3DIntegration()
  };

  console.log('\n📈 Test Results Summary:');
  console.log('Concept3D Service:', results.concept3dService.success ? '✅ PASS' : '❌ FAIL');
  console.log('Integration Test:', results.integration.success ? '✅ PASS' : '❌ FAIL');

  if (!results.concept3dService.success) {
    console.log('Concept3D Service Error:', results.concept3dService.error);
  }
  if (!results.integration.success) {
    console.log('Integration Error:', results.integration.error);
  }

  return results;
}

// Example usage in browser console:
// import('./test-concept3d-wayfinding').then(({ runAllTests }) => runAllTests())

export default {
  testConcept3DWayfinding,
  testConcept3DIntegration,
  runAllTests
};
