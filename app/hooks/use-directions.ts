import MapLibreGlDirections, {
  LoadingIndicatorControl,
} from "@maplibre/maplibre-gl-directions";
import { useEffect, useRef } from "react";
import config from "~/config";
import IndoorDirections from "~/indoor-directions/directions/main";
import building from "~/mock/building.json";
import building from "~/mock/building.json";

function useDirections(map: maplibregl.Map | null) {
  const directionsRef = useRef<MapLibreGlDirections | null>(null);
  const indoorDirectionsRef = useRef<IndoorDirections | null>(null);

  useEffect(() => {
    if (!map) return;

    const handleLoad = () => {
      directionsRef.current = new MapLibreGlDirections(map, {
        api: config.routingApi,
        requestOptions: { overview: "full", steps: "true" },
      });
      map.addControl(new LoadingIndicatorControl(directionsRef.current));

      indoorDirectionsRef.current = new IndoorDirections(map);
      
      // Load indoor routes data into the IndoorDirections instance
      if (building.indoor_routes && indoorDirectionsRef.current) {
        console.log('🗺️ Loading indoor routes data into IndoorDirections:', building.indoor_routes.features.length, 'features');
        try {
          indoorDirectionsRef.current.loadMapData(building.indoor_routes as GeoJSON.FeatureCollection);
          console.log('✅ Indoor routes data loaded successfully');
        } catch (error) {
          console.error('❌ Failed to load indoor routes data:', error);
        }
      }
    };

    map.on("load", handleLoad);

    return () => {
      map.off("load", handleLoad);
      directionsRef.current = null;
      indoorDirectionsRef.current = null;
    };
  }, [map]);

  return {
    directions: directionsRef.current,
    indoorDirections: indoorDirectionsRef.current,
  };
}

export default useDirections;
