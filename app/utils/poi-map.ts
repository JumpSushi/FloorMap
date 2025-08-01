import building from "~/mock/building.json";
import { booleanPointInPolygon } from "@turf/boolean-point-in-polygon";

function isPolygonFeature(
  feature: GeoJSON.Feature,
): feature is GeoJSON.Feature<GeoJSON.Polygon> {
  return (
    feature?.geometry?.type === "Polygon" &&
    feature?.properties?.feature_type === "unit"
  );
}

const indoorMap = building.indoor_map as GeoJSON.FeatureCollection;
const unitFeatures = indoorMap.features.filter((element) =>
  isPolygonFeature(element),
);
const poiMap = new Map<string | number, GeoJSON.Feature<GeoJSON.Point>[]>();

unitFeatures.forEach((unitFeature) => {
  // Handle both string and numeric IDs by using the original ID
  const featureId = unitFeature.id;
  if (featureId !== null && featureId !== undefined) {
    poiMap.set(featureId, []);
  }
});

(building.pois.features as GeoJSON.Feature<GeoJSON.Point>[]).forEach(
  (poiFeature) => {
    const poiCoordinates = poiFeature.geometry.coordinates;

    for (const unitFeature of unitFeatures) {
      if (
        booleanPointInPolygon(
          poiCoordinates,
          unitFeature as GeoJSON.Feature<GeoJSON.Polygon>,
        ) && unitFeature.id !== null && unitFeature.id !== undefined
      ) {
        poiMap.get(unitFeature.id)?.push(poiFeature);

        break;
      }
    }
  },
);

export default poiMap;
