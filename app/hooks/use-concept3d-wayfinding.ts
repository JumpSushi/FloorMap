import { useCallback } from 'react';
import Concept3DWayfindingService, { Concept3DRoute, Concept3DWayfindingOptions } from '~/services/concept3d-wayfinding';
import config from '~/config';

/**
 * Hook for using the Concept3D official wayfinding API
 * 
 * This hook provides direct access to the Concept3D wayfinding service
 * for outdoor directions with official API integration.
 */
export function useConcept3DWayfinding() {
  const service = new Concept3DWayfindingService({
    map: config.concept3d.mapId,
    key: config.concept3d.apiKey,
    stamp: config.concept3d.defaultStamp
  });

  /**
   * Get outdoor directions between two points using Concept3D API
   */
  const getDirections = useCallback(async (
    from: [number, number], // [longitude, latitude]
    to: [number, number],   // [longitude, latitude]
    options?: Partial<Concept3DWayfindingOptions>
  ): Promise<Concept3DRoute> => {
    try {
      console.log('🗺️ Getting Concept3D directions from', from, 'to', to);
      
      const route = await service.getDirections(from, to, {
        ...options,
        stamp: service.generateStamp() // Always generate a unique stamp
      });
      
      console.log('✅ Concept3D directions received:', {
        distance: route.distance,
        duration: route.duration,
        formattedDuration: route.formattedDuration,
        segments: route.route.length,
        provider: route.provider
      });
      
      return route;
    } catch (error) {
      console.error('❌ Failed to get Concept3D directions:', error);
      throw error;
    }
  }, [service]);

  /**
   * Convert Concept3D route to GeoJSON for map display
   */
  const routeToGeoJSON = useCallback((route: Concept3DRoute): GeoJSON.LineString => {
    return service.routeToGeoJSON(route);
  }, [service]);

  /**
   * Get turn-by-turn instructions from a Concept3D route
   */
  const getInstructions = useCallback((route: Concept3DRoute): string[] => {
    return service.getInstructions(route);
  }, [service]);

  /**
   * Get detailed route information including segments
   */
  const getRouteDetails = useCallback((route: Concept3DRoute) => {
    return {
      distance: route.distance,
      duration: route.duration,
      formattedDuration: route.formattedDuration,
      provider: route.provider,
      directionsType: route.directionsType,
      totalSegments: route.route.length,
      pivotPoints: route.pivotPoints.length,
      fullPathPoints: route.fullPath.length,
      bbox: route.bbox,
      segments: route.route.map(segment => ({
        action: segment.action,
        distance: segment.distance,
        formattedDistance: segment.formattedDistance,
        duration: segment.duration,
        formattedDuration: segment.formattedDuration,
        modifier: segment.modifier,
        type: segment.type,
        level: segment.level,
        coordinateCount: segment.route.length
      }))
    };
  }, []);

  /**
   * Convert route for use with existing map systems (OSM-compatible format)
   */
  const routeToOSMFormat = useCallback((route: Concept3DRoute) => {
    return service.routeToOSMFormat(route);
  }, [service]);

  return {
    getDirections,
    routeToGeoJSON,
    getInstructions,
    getRouteDetails,
    routeToOSMFormat,
    service // Expose service for advanced usage
  };
}

export default useConcept3DWayfinding;
