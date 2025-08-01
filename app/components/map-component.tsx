import MaplibreInspect from "@maplibre/maplibre-gl-inspect";
import "@maplibre/maplibre-gl-inspect/dist/maplibre-gl-inspect.css";
import maplibregl, { FullscreenControl, NavigationControl } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useMemo, useRef } from "react";
import config from "~/config";
import IndoorMapLayer from "~/layers/indoor-map-layer";
import POIsLayer from "~/layers/pois-layer";
import building from "~/mock/building.json";
import useMapStore from "~/stores/use-map-store";
import useFloorStore from "~/stores/floor-store";
import DiscoveryPanel from "./discovery-panel/discovery-panel";
import { FloorSelector } from "./floor-selector";
import { FloorUpDownControl } from "./floor-up-down-control";
import { IndoorMapGeoJSON } from "~/types/geojson";
import { Theme, useTheme } from "remix-themes";
import "~/maplibre.css";

export default function MapComponent() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const [theme] = useTheme();
  const { currentFloor } = useFloorStore();

  const setMapInstance = useMapStore((state) => state.setMapInstance);
  const indoorMapLayer = useMemo(
    () =>
      new IndoorMapLayer(
        building.indoor_map as IndoorMapGeoJSON,
        theme as string,
      ),
    [theme],
  );

  const poisLayer = useMemo(
    () => new POIsLayer(building.pois as GeoJSON.GeoJSON, theme as string),
    [theme],
  );

  useEffect(() => {
    if (!mapContainer.current) return;

    const map = new maplibregl.Map({
      ...config.mapConfig,
      style: config.mapStyles[theme as Theme],
      container: mapContainer.current,
    });
    setMapInstance(map);

    map.on("load", () => {
      try {
        // map.addLayer(new Tile3dLayer());
        map.addLayer(indoorMapLayer);
        map.addLayer(poisLayer);
        
        // Set initial floor from store and apply filters
        indoorMapLayer.setFloorLevel(currentFloor);
        poisLayer.setFloorLevel(currentFloor);
      } catch (error) {
        console.error("Failed to initialize map layers:", error);
      }
    });

    map.addControl(new NavigationControl(), "bottom-right");
    map.addControl(new FullscreenControl(), "bottom-right");

    if (process.env.NODE_ENV === "development") {
      map.addControl(
        new MaplibreInspect({
          popup: new maplibregl.Popup({
            closeOnClick: false,
          }),
          blockHoverPopupOnClick: true,
        }),
        "bottom-right",
      );
    }

    return () => {
      map.remove();
    };
  }, [indoorMapLayer, poisLayer, setMapInstance, theme]);

  // Listen for floor changes and update map layers
  useEffect(() => {
    indoorMapLayer.setFloorLevel(currentFloor);
    poisLayer.setFloorLevel(currentFloor);
  }, [currentFloor, indoorMapLayer, poisLayer]);

  return (
    <div className="flex size-full flex-col">
      <DiscoveryPanel />
      <FloorSelector indoorMapLayer={indoorMapLayer} poisLayer={poisLayer} />
      <FloorUpDownControl indoorMapLayer={indoorMapLayer} poisLayer={poisLayer} />

      <div ref={mapContainer} className="relative size-full">
        {/* FloorMap overlay in bottom left corner */}
        <div className="absolute bottom-4 left-4 z-10 pointer-events-none">
          <img 
            src="/floormap_large.png" 
            alt="Floor map overlay"
            className="max-w-48 opacity-30 rounded-lg shadow-lg"
          />
        </div>
      </div>
    </div>
  );
}
