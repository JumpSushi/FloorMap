import { useCallback } from "react";
import CrossBuildingNavigationService, { CrossBuildingRoute, OSMRoutingOptions } from "~/services/cross-building-navigation";
import { Map, LngLatBounds } from 'maplibre-gl';
import config from "~/config";
import IndoorDirections from "~/indoor-directions/directions/main";

function useEnhancedDirections(map: Map | null, indoorDirections: IndoorDirections | null = null) {
  /**
   * Navigate between any two points (indoor/outdoor/cross-building)
   */
  const navigateToLocation = useCallback(async (
    start: [number, number] | { coordinates: [number, number], building?: string, floor?: string },
    end: [number, number] | { coordinates: [number, number], building?: string, floor?: string },
    options: OSMRoutingOptions & { accessibleRoute?: boolean } = {}
  ): Promise<CrossBuildingRoute | null> => {
    console.log('navigateToLocation called:', { start, end, options, map });
    
    if (!map) {
      console.error('Map not available');
      return null;
    }

    try {
      const navigationService = new CrossBuildingNavigationService(config.routingApi, indoorDirections);
      const route = await navigationService.findCrossBuildingRoute(start, end, options);
      
      if (route) {
        // Validate route before displaying to prevent random extra sections
        if (route.outdoor && route.outdoor.geometry && route.outdoor.geometry.coordinates) {
          const coords = route.outdoor.geometry.coordinates;
          console.log('Route validation:', {
            hasGeometry: !!route.outdoor.geometry,
            coordinateCount: coords.length,
            distance: route.outdoor.distance,
            firstCoord: coords[0],
            lastCoord: coords[coords.length - 1]
          });
        }
        
        // Display the route on the map
        displayRouteOnMap(route);
      }

      return route;
    } catch (error) {
      console.error('Navigation failed:', error);
      
      // For indoor navigation errors, preserve indoor routes if they exist
      // Only clear everything if we truly failed to get a route
      const errorMessage = error instanceof Error ? error.message : String(error);
      const isDisplayError = errorMessage.includes('display') || errorMessage.includes('layer') || errorMessage.includes('source');
      
      if (isDisplayError) {
        console.warn('Route display error, preserving any existing indoor routes');
        // Don't clear routes for display errors - the route might still be valid
      } else {
        console.log('Route calculation failed, clearing all routes');
        clearRouteFromMap();
      }
      
      // Provide more specific error feedback
      if (error instanceof Error) {
        if (error.message.includes('internet connection')) {
          console.error('Network error during navigation');
        } else if (error.message.includes('No route found')) {
          console.error('No valid route could be calculated');
        } else {
          console.error('Unexpected navigation error:', error.message);
        }
      }
      
      return null;
    }
  }, [map]);

  /**
   * Navigate from current GPS location to a destination
   */
  const navigateFromCurrentLocation = useCallback(async (
    destination: [number, number] | { coordinates: [number, number], building?: string, floor?: string },
    options: OSMRoutingOptions & { accessibleRoute?: boolean } = {}
  ): Promise<CrossBuildingRoute | null> => {
    console.log('navigateFromCurrentLocation called:', { destination, options });
    
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        console.error('Geolocation not supported');
        reject(new Error('Geolocation not supported'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const start: [number, number] = [
            position.coords.longitude,
            position.coords.latitude
          ];
          
          try {
            const route = await navigateToLocation(start, destination, options);
            resolve(route);
          } catch (error) {
            reject(error);
          }
        },
        (error) => {
          console.error('Geolocation error:', error);
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        }
      );
    });
  }, [navigateToLocation]);

  /**
   * Display route segments on the map
   */
  const displayRouteOnMap = useCallback((route: CrossBuildingRoute) => {
    console.log('displayRouteOnMap called:', route);
    if (!map) return;

    // Check if this route has indoor segments that need to be preserved
    const hasIndoorSegments = route.indoor.start || route.indoor.end;
    const isIndoorOnly = route.indoor.start && 
      (!route.outdoor.geometry || 
       !route.outdoor.geometry.coordinates || 
       route.outdoor.geometry.coordinates.length === 0);
    
    console.log('Route type detection:', {
      hasIndoorStart: !!route.indoor.start,
      hasIndoorEnd: !!route.indoor.end,
      hasOutdoorGeometry: !!route.outdoor.geometry,
      outdoorCoordinatesLength: route.outdoor.geometry?.coordinates?.length || 0,
      hasIndoorSegments,
      isIndoorOnly
    });
    
    // Always preserve indoor routes if they exist (for both indoor-only and cross-building routes)
    if (hasIndoorSegments) {
      console.log('Route has indoor segments, preserving indoor directions');
      clearRouteFromMap(true); // true = preserve indoor routes
    } else {
      console.log('Route has no indoor segments, clearing all routes');
      clearRouteFromMap(false); // false = don't preserve indoor routes
    }

    // Display indoor routes if they exist (for both indoor-only and cross-building routes)
    if (hasIndoorSegments) {
      console.log('Displaying indoor routes via IndoorDirections');
      
      // Check if the indoor directions source exists and has data
      const indoorSource = map.getSource('maplibre-gl-indoor-directions');
      if (indoorSource && 'getData' in indoorSource) {
        const sourceData = (indoorSource as any).getData();
        console.log('🗺️ Indoor directions source data:', sourceData);
      } else {
        console.warn('❌ Indoor directions source not found or has no data');
      }
      
      // Check if indoor direction layers are visible
      const indoorLayers = ['maplibre-gl-indoor-directions-routeline', 'maplibre-gl-indoor-directions-routeline-casing'];
      indoorLayers.forEach(layerId => {
        const layer = map.getLayer(layerId);
        if (layer) {
          console.log(`✅ Indoor layer ${layerId} exists:`, layer);
          const visibility = map.getLayoutProperty(layerId, 'visibility');
          console.log(`👁️ Layer ${layerId} visibility:`, visibility || 'visible');
        } else {
          console.warn(`❌ Indoor layer ${layerId} not found`);
        }
      });
      
      // For indoor-only routes, we can return early since no outdoor display is needed
      if (isIndoorOnly) {
        console.log('Indoor-only route, skipping outdoor display');
        return;
      }
    }

    // Display transition lines (dotted lines from building to road)
    const transitionFeatures: GeoJSON.Feature[] = [];
    
    if (route.transition.toOutdoor) {
      transitionFeatures.push({
        type: 'Feature',
        geometry: route.transition.toOutdoor,
        properties: {
          route_type: 'transition',
          transition_type: 'exit_to_road',
          description: 'Walking from building exit to main road'
        }
      });
    }
    
    if (route.transition.toIndoor) {
      transitionFeatures.push({
        type: 'Feature',
        geometry: route.transition.toIndoor,
        properties: {
          route_type: 'transition',
          transition_type: 'road_to_entrance',
          description: 'Walking from main road to building entrance'
        }
      });
    }

    if (transitionFeatures.length > 0) {
      const transitionData: GeoJSON.FeatureCollection = {
        type: 'FeatureCollection',
        features: transitionFeatures
      };

      if (!map.getSource('transition-route')) {
        map.addSource('transition-route', {
          type: 'geojson',
          data: transitionData
        });

        map.addLayer({
          id: 'transition-route-line',
          type: 'line',
          source: 'transition-route',
          layout: {
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-color': '#8b5cf6', // Purple color for transitions
            'line-width': 3,
            'line-opacity': 0.8,
            'line-dasharray': [2, 3] // Dotted line pattern
          }
        });
      } else {
        (map.getSource('transition-route') as any).setData(transitionData);
      }
    }

    // Display outdoor route if exists (use geometry from OSMRoute)
    if (route.outdoor.geometry && route.outdoor.distance > 0) {
      // Validate and clean the geometry to prevent random extra sections
      const coordinates = route.outdoor.geometry.coordinates;
      
      // Basic validation: ensure we have at least 2 points and no invalid coordinates
      if (!coordinates || coordinates.length < 2) {
        console.warn('Invalid outdoor route geometry, skipping display');
        return;
      }
      
      // Create a clean copy of coordinates to prevent any reference contamination
      const cleanCoordinates = coordinates.map((coord: any) => {
        if (Array.isArray(coord) && coord.length >= 2) {
          return [Number(coord[0]), Number(coord[1])];
        }
        return null;
      }).filter(coord => coord !== null);
      
      // Check for any invalid coordinate values
      const validCoordinates = cleanCoordinates.filter((coord: any) => {
        return Array.isArray(coord) && 
               coord.length >= 2 && 
               typeof coord[0] === 'number' && 
               typeof coord[1] === 'number' &&
               !isNaN(coord[0]) && 
               !isNaN(coord[1]) &&
               Math.abs(coord[0]) <= 180 && 
               Math.abs(coord[1]) <= 90;
      });
      
      if (validCoordinates.length !== cleanCoordinates.length) {
        console.warn('Found invalid coordinates in route geometry, filtered out', {
          original: coordinates.length,
          clean: cleanCoordinates.length,
          valid: validCoordinates.length
        });
      }
      
      if (validCoordinates.length < 2) {
        console.warn('Not enough valid coordinates to display route');
        return;
      }

      console.log('Displaying outdoor route with validated coordinates:', {
        originalCount: coordinates.length,
        validCount: validCoordinates.length,
        firstCoord: validCoordinates[0],
        lastCoord: validCoordinates[validCoordinates.length - 1]
      });

      const geojsonData: GeoJSON.FeatureCollection = {
        type: 'FeatureCollection',
        features: [{
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: validCoordinates
          },
          properties: {
            route_type: 'outdoor',
            distance: route.outdoor.distance,
            duration: route.outdoor.duration
          }
        }]
      };

      if (!map.getSource('outdoor-route')) {
        map.addSource('outdoor-route', {
          type: 'geojson',
          data: geojsonData
        });

        map.addLayer({
          id: 'outdoor-route-line',
          type: 'line',
          source: 'outdoor-route',
          layout: {
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-color': '#3b82f6',
            'line-width': 4,
            'line-opacity': 0.8
          }
        });
      } else {
        (map.getSource('outdoor-route') as any).setData(geojsonData);
      }
    }

    // Fit map to show the entire route including transitions
    const allCoordinates: [number, number][] = [];
    
    // Add outdoor route coordinates
    if (route.outdoor.geometry && route.outdoor.geometry.coordinates.length > 0) {
      allCoordinates.push(...route.outdoor.geometry.coordinates as [number, number][]);
    }
    
    // Add transition coordinates
    if (route.transition.toOutdoor) {
      allCoordinates.push(...route.transition.toOutdoor.coordinates as [number, number][]);
    }
    if (route.transition.toIndoor) {
      allCoordinates.push(...route.transition.toIndoor.coordinates as [number, number][]);
    }
    
    // Add indoor route coordinates (start points for bounds calculation)
    if (route.indoor.start && route.indoor.start.coordinates.length > 0) {
      // Just add the start and end points of indoor routes to avoid too much zoom
      const startCoords = route.indoor.start.coordinates as [number, number][];
      allCoordinates.push(startCoords[0], startCoords[startCoords.length - 1]);
    }
    if (route.indoor.end && route.indoor.end.coordinates.length > 0) {
      const endCoords = route.indoor.end.coordinates as [number, number][];
      allCoordinates.push(endCoords[0], endCoords[endCoords.length - 1]);
    }
    
    // Fit bounds to all coordinates
    if (allCoordinates.length > 0) {
      try {
        const bounds = allCoordinates.reduce((bounds, coord) => {
          return bounds.extend(coord);
        }, new LngLatBounds(allCoordinates[0], allCoordinates[0]));

        map.fitBounds(bounds, {
          padding: 80, // More padding for complex routes
          duration: 1000
        });
      } catch (error) {
        console.error('Error fitting bounds to route:', error);
      }
    }
  }, [map]);

  /**
   * Clear route visualization from map
   */
  const clearRouteFromMap = useCallback((preserveIndoor: boolean = false) => {
    console.log('clearRouteFromMap called with preserveIndoor:', preserveIndoor);
    console.trace('clearRouteFromMap call stack:'); // Add stack trace to see where it's called from
    if (!map) return;

    // Clear outdoor route with detailed logging
    if (map.getLayer('outdoor-route-line')) {
      console.log('Removing outdoor-route-line layer');
      map.removeLayer('outdoor-route-line');
    }
    if (map.getSource('outdoor-route')) {
      console.log('Removing outdoor-route source');
      map.removeSource('outdoor-route');
    }
    
    // Clear transition routes (dotted lines)
    if (map.getLayer('transition-route-line')) {
      console.log('Removing transition-route-line layer');
      map.removeLayer('transition-route-line');
    }
    if (map.getSource('transition-route')) {
      console.log('Removing transition-route source');
      map.removeSource('transition-route');
    }
    
    // Clear indoor directions only if not preserving indoor routes
    if (!preserveIndoor && indoorDirections) {
      console.log('Clearing indoor directions');
      indoorDirections.clear();
    } else if (preserveIndoor) {
      console.log('Preserving indoor directions as requested');
    }
    
    // Also clear any potential conflicting direction layers that might interfere
    try {
      const layers = map.getStyle()?.layers || [];
      const routeLayers = layers.filter(layer => 
        layer.id.includes('route') || 
        layer.id.includes('maplibre-gl-directions')
      );
      console.log('Found potential route layers on map:', routeLayers.map(l => l.id));
    } catch (error) {
      console.warn('Could not check for conflicting layers:', error);
    }
  }, [map, indoorDirections]);

  return {
    navigateToLocation,
    navigateFromCurrentLocation,
    displayRouteOnMap,
    clearRouteFromMap
  };
}

/**
 * Helper function to extract all coordinates from a GeoJSON
 */
function getAllCoordinatesFromGeoJSON(geojson: GeoJSON.FeatureCollection | GeoJSON.Feature): number[][] {
  const coordinates: number[][] = [];
  
  if (geojson.type === 'FeatureCollection') {
    geojson.features.forEach(feature => {
      coordinates.push(...getAllCoordinatesFromGeoJSON(feature));
    });
  } else if (geojson.type === 'Feature') {
    if (geojson.geometry.type === 'LineString') {
      coordinates.push(...geojson.geometry.coordinates);
    } else if (geojson.geometry.type === 'MultiLineString') {
      geojson.geometry.coordinates.forEach(line => {
        coordinates.push(...line);
      });
    }
  }
  
  return coordinates;
}

export default useEnhancedDirections;
