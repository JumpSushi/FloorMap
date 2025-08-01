import "@maplibre/maplibre-gl-geocoder/dist/maplibre-gl-geocoder.css";
import { useCallback, useEffect, useState } from "react";
import building from "~/mock/building.json";
import useMapStore from "~/stores/use-map-store";

import useDirections from "~/hooks/use-directions";
import { useEnhancedIndoorGeocoder } from "~/hooks/use-enhanced-indoor-geocoder";
import { POI } from "~/types/poi";
import { Card, CardContent } from "../ui/card";
import DiscoveryView from "./discovery-view";
import LocationDetail from "./location-detail";
import EnhancedNavigationView from "./enhanced-navigation-view";
import poiMap from "~/utils/poi-map";
import { MapGeoJSONFeature, MapMouseEvent } from "maplibre-gl";

type UIMode = "discovery" | "detail" | "navigation";

export default function DiscoveryPanel() {
  const map = useMapStore((state) => state.mapInstance);
  const [mode, setMode] = useState<UIMode>("discovery");
  const [selectedPOI, setSelectedPOI] = useState<POI | null>(null);
  const { indoorDirections } = useDirections(map);
  const indoorGeocoder = useEnhancedIndoorGeocoder();

  indoorDirections?.loadMapData(
    building.indoor_routes as GeoJSON.FeatureCollection,
  );

  const navigateToPOI = useCallback(
    (coordinates: GeoJSON.Position) => {
      map?.flyTo({
        center: coordinates as [number, number],
        zoom: 20,
        duration: 1300,
      });
    },
    [map],
  );

  function handleSelectPOI(poi: POI) {
    setSelectedPOI(poi);
    setMode("detail");
    navigateToPOI(poi.coordinates);
  }

  function handleBackClick() {
    setMode("discovery");
    setSelectedPOI(null);
    indoorDirections?.clear();
  }

  useEffect(() => {
    const handleMapClick = (
      event: MapMouseEvent & {
        features?: MapGeoJSONFeature[];
      },
    ) => {
      const { features } = event;
      if (!features?.length) return;

      const clickedFeature = features[0];
      const unitId = clickedFeature.id; // Keep original ID (string or number)
      const featureProps = clickedFeature.properties;
      
      // Check if this is a Reiss or Darnall feature that should show building info
      const isReissFeature = featureProps?.building_id === 'reiss';
      let isDarnallFeature = featureProps?.building_id === 'darnall' || featureProps?.building_id === 'GU_DARNALL';
      
      // Also check for Darnall features by coordinate location (for rooms without building_id)
      if (!isDarnallFeature && clickedFeature.geometry?.type === 'Polygon') {
        const coords = clickedFeature.geometry.coordinates[0][0];
        if (coords && Array.isArray(coords) && coords.length >= 2) {
          const [lng, lat] = coords;
          // Check if coordinates are within Darnall Hall bounds (approximate)
          if (lng >= -77.075 && lng <= -77.072 && lat >= 38.910 && lat <= 38.912) {
            isDarnallFeature = true;
          }
        }
      }
      
      if (isReissFeature || isDarnallFeature) {
        // For Reiss and Darnall features, always create a POI that shows building info
        // Use the feature name if available, otherwise use a generic name based on feature type
        const coordinates: [number, number] = [event.lngLat.lng, event.lngLat.lat];
        let displayName = featureProps.name;
        
        if (!displayName) {
          // For unnamed features like level polygons, use building name
          if (isDarnallFeature) {
            displayName = 'Darnall Hall';
          } else if (isReissFeature) {
            displayName = 'Reiss Science Building';
          }
        }
        
        const poi: POI = {
          id: `feature-${unitId || 'unknown'}`,
          name: displayName,
          type: featureProps.category || featureProps.feature_type || 'room',
          coordinates: coordinates,
          building: isDarnallFeature ? (featureProps.building_id || 'darnall') : featureProps.building_id,
          floor: featureProps.level_id,
        };
        setSelectedPOI(poi);
        if (mode === "discovery" || mode === "detail") {
          navigateToPOI(poi.coordinates);
          if (mode === "discovery") {
            setMode("detail");
          }
        }
      } else if (unitId !== null && unitId !== undefined) {
        // Original logic for other features
        const relatedPOIs = poiMap.get(unitId);

        if (relatedPOIs && relatedPOIs[0]) {
          const firstPOI = relatedPOIs[0];

          //TODO: find cleaner way to convert GeoJSON.Feature to POI
          const poi: POI = {
            id: firstPOI.properties?.id as number,
            name: firstPOI.properties?.name as string,
            type: firstPOI.properties?.type as string,
            coordinates: firstPOI.geometry.coordinates as [number, number],
            building: firstPOI.properties?.building_id as string,
            floor: firstPOI.properties?.floor as number,
          };
          setSelectedPOI(poi);
          if (mode === "discovery" || mode === "detail") {
            navigateToPOI(poi.coordinates);
            if (mode === "discovery") {
              setMode("detail");
            }
          }
        }
      }
    };

    map?.on("click", "indoor-map-extrusion", handleMapClick);
    return () => {
      map?.off("click", "indoor-map-extrusion", handleMapClick);
    };
  }, [map, mode, navigateToPOI]);

  return (
    <Card className="absolute z-10 w-full rounded-xl shadow-lg md:absolute md:left-4 md:top-4 md:max-w-[28rem]">
      <CardContent className="p-4">
        {mode === "discovery" && (
          <DiscoveryView
            indoorGeocoder={indoorGeocoder}
            onSelectPOI={handleSelectPOI}
          />
        )}
        {mode === "detail" && selectedPOI && (
          <LocationDetail
            selectedPOI={selectedPOI}
            handleDirectionsClick={() => setMode("navigation")}
            handleBackClick={handleBackClick}
          />
        )}
        {mode === "navigation" && (
          <EnhancedNavigationView
            handleBackClick={handleBackClick}
            selectedPOI={selectedPOI}
            indoorGeocoder={indoorGeocoder}
            indoorDirections={indoorDirections}
          />
        )}
      </CardContent>
    </Card>
  );
}
