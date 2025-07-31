import { useCallback } from "react";
import CrossBuildingNavigationService, { CrossBuildingRoute, OSMRoutingOptions } from "~/services/cross-building-navigation";
import { Map, LngLatBounds } from 'maplibre-gl';
import config from "~/config";

function useEnhancedDirections(map: Map | null) {
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
      const navigationService = new CrossBuildingNavigationService(config.routingApi, null);
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
      
      // Clear any existing routes on error
      clearRouteFromMap();
      
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

    // Clear any existing route displays
    clearRouteFromMap();

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

    // Fit map to show the entire route
    if (route.outdoor.geometry && route.outdoor.geometry.coordinates.length > 0) {
      const coordinates = route.outdoor.geometry.coordinates;
      
      // Only fit bounds if we have valid coordinates
      if (coordinates.length > 0) {
        try {
          const bounds = coordinates.reduce((bounds, coord) => {
            return bounds.extend(coord as [number, number]);
          }, new LngLatBounds(coordinates[0] as [number, number], coordinates[0] as [number, number]));

          map.fitBounds(bounds, {
            padding: 50,
            duration: 1000
          });
        } catch (error) {
          console.error('Error fitting bounds to route:', error);
        }
      }
    }
  }, [map]);

  /**
   * Clear route visualization from map
   */
  const clearRouteFromMap = useCallback(() => {
    console.log('clearRouteFromMap called');
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
    
    // Also clear any potential conflicting indoor direction layers that might interfere
    try {
      const layers = map.getStyle()?.layers || [];
      const routeLayers = layers.filter(layer => 
        layer.id.includes('route') || 
        layer.id.includes('direction') || 
        layer.id.includes('maplibre-gl-directions')
      );
      console.log('Found potential route layers on map:', routeLayers.map(l => l.id));
    } catch (error) {
      console.warn('Could not check for conflicting layers:', error);
    }
  }, [map]);

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
