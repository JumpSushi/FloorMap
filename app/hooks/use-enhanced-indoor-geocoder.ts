import { useMemo } from "react";
import { EnhancedIndoorGeocoder } from "~/utils/enhanced-indoor-geocoder";
import building from "~/mock/building.json";

/**
 * Hook for enhanced indoor geocoding with OpenStreetMap support
 */
export function useEnhancedIndoorGeocoder() {
  return useMemo(() => {
    const poisFeatureCollection = building.pois as GeoJSON.FeatureCollection;
    return new EnhancedIndoorGeocoder(poisFeatureCollection.features as any[]);
  }, []);
}
