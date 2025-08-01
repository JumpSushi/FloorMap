import { CustomLayerInterface, Map } from "maplibre-gl";

export default class POIsLayer implements CustomLayerInterface {
  id: string = "pois";
  type = "custom" as const;
  private POIs: GeoJSON.GeoJSON;
  private theme;
  private map?: Map;

  constructor(POIs: GeoJSON.GeoJSON, theme: string = "light") {
    this.POIs = POIs;
    this.theme = theme;
  }

  // Method to update floor filter
  setFloorLevel(level: string | number) {
    if (!this.map) return;
    
    // Filter POIs by floor - show:
    // 1. POIs without floor property (outdoor/campus POIs)
    // 2. Building-level POIs (residence_hall, academic_building, etc.) - these should always be visible
    // 3. POIs for current floor (individual rooms, restrooms)
    const floorFilter = [
      "any",
      ["!", ["has", "floor"]], // Show POIs without floor property
      [
        "in", 
        ["get", "type"], 
        [
          "literal", 
          ["residence_hall", "academic_building", "library", "dining", "athletic_facility", "chapel", "outdoor_space"]
        ]
      ], // Show building-level POIs (removed "entrance" to make entrances floor-specific)
      ["==", ["get", "floor"], level] // Show POIs for current floor (rooms, restrooms, entrances)
    ] as any;
    
    this.map.setFilter("point", floorFilter);
    this.map.setFilter("point-label", floorFilter);
  }

  render = () => {
    // Rendering is handled by maplibre's internal renderer for geojson sources
  };

  onAdd?(map: Map): void {
    this.map = map; // Store map reference for floor filtering
    
    const lightColor = {
      text: "#404040",
      halo: "#ffffff",
      circle: "#695f58",
      academic: "#2563eb", // Blue for academic buildings
      library: "#7c3aed", // Purple for library
      dining: "#dc2626", // Red for dining
      athletic: "#059669", // Green for athletic facilities
      chapel: "#ca8a04", // Gold for chapel
      outdoor: "#16a34a", // Green for outdoor spaces
      residence: "#ec4899", // Pink for residence halls
      dorm_room: "#f97316", // Orange for individual dorm rooms
      restroom: "#6366f1", // Indigo for restrooms
      entrance: "#065f46", // Dark green for entrances
    };

    const darkColor = {
      text: "#ffffff",
      halo: "#404040",
      circle: "#9ca3af",
      academic: "#60a5fa", // Light blue for academic buildings
      library: "#a78bfa", // Light purple for library
      dining: "#f87171", // Light red for dining
      athletic: "#34d399", // Light green for athletic facilities
      chapel: "#fbbf24", // Light gold for chapel
      outdoor: "#4ade80", // Light green for outdoor spaces
      residence: "#f472b6", // Light pink for residence halls
      dorm_room: "#fb923c", // Light orange for individual dorm rooms
      restroom: "#818cf8", // Light indigo for restrooms
      entrance: "#10b981", // Light green for entrances
    };

    const color = this.theme === "light" ? lightColor : darkColor;

    map.addSource("pois", {
      type: "geojson",
      data: this.POIs,
    });

    map.addLayer({
      id: "point",
      type: "circle",
      source: "pois",
      minzoom: 15, // Lower minzoom so rooms are visible earlier
      paint: {
        "circle-radius": [
          "case",
          ["==", ["get", "type"], "academic_building"], 6,
          ["==", ["get", "type"], "library"], 6,
          ["==", ["get", "type"], "residence_hall"], 6,
          ["==", ["get", "type"], "dining"], 5,
          ["==", ["get", "type"], "athletic_facility"], 5,
          ["==", ["get", "type"], "chapel"], 5,
          ["==", ["get", "type"], "outdoor_space"], 4,
          ["==", ["get", "type"], "entrance"], 5, // Medium size for entrances
          ["==", ["get", "type"], "dorm_room"], 3, // Smaller for individual rooms
          ["==", ["get", "type"], "restroom"], 4, // Medium size for restrooms
          4 // default
        ],
        "circle-color": [
          "case",
          ["==", ["get", "type"], "academic_building"], color.academic,
          ["==", ["get", "type"], "library"], color.library,
          ["==", ["get", "type"], "residence_hall"], color.residence,
          ["==", ["get", "type"], "dining"], color.dining,
          ["==", ["get", "type"], "athletic_facility"], color.athletic,
          ["==", ["get", "type"], "chapel"], color.chapel,
          ["==", ["get", "type"], "outdoor_space"], color.outdoor,
          ["==", ["get", "type"], "entrance"], color.entrance,
          ["==", ["get", "type"], "dorm_room"], color.dorm_room,
          ["==", ["get", "type"], "restroom"], color.restroom,
          color.circle // default
        ],
        "circle-stroke-color": "#ffffff",
        "circle-stroke-width": 1,
      },
    });

    map.addLayer({
      id: "point-label",
      type: "symbol",
      source: "pois",
      minzoom: 17, // Show room labels only at higher zoom
      layout: {
        "text-field": ["get", "name"],
        "text-font": ["Noto Sans Regular"],
        "text-size": [
          "case",
          ["==", ["get", "type"], "academic_building"], 13,
          ["==", ["get", "type"], "library"], 13,
          ["==", ["get", "type"], "residence_hall"], 13,
          ["==", ["get", "type"], "outdoor_space"], 14,
          ["==", ["get", "type"], "entrance"], 12, // Medium text for entrances
          ["==", ["get", "type"], "dorm_room"], 10, // Smaller text for rooms
          ["==", ["get", "type"], "restroom"], 11, // Medium text for restrooms
          12 // default
        ],
        "text-offset": [0.8, 0],
        "text-anchor": "left",
        "text-max-width": 12,
      },
      paint: {
        "text-color": color.text,
        "text-halo-color": color.halo,
        "text-halo-width": 1.5,
      },
    });
  }
}
