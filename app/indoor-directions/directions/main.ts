import Graph from "../pathfinding/graph";
import PathFinder from "../pathfinding/pathfinder";
import { MapLibreGlDirectionsConfiguration } from "../types";
import {
  IndoorDirectionsEvented,
  IndoorDirectionsRoutingEvent,
  IndoorDirectionsWaypointEvent,
} from "./events";
import {
  buildConfiguration,
  buildPoint,
  buildRouteLines,
  buildSnaplines,
} from "./utils";
export default class IndoorDirections extends IndoorDirectionsEvented {
  protected declare readonly map: maplibregl.Map;
  private readonly pathFinder: PathFinder;

  protected readonly configuration: MapLibreGlDirectionsConfiguration;

  protected buildPoint = buildPoint;
  protected buildSnaplines = buildSnaplines;
  protected buildRouteLines = buildRouteLines;

  protected _waypoints: GeoJSON.Feature<GeoJSON.Point>[] = [];
  protected snappoints: GeoJSON.Feature<GeoJSON.Point>[] = [];
  protected routelines: GeoJSON.Feature<GeoJSON.LineString>[][] = [];
  private coordMap: Map<string, Set<GeoJSON.Position[]>> = new Map();
  private animationFrameId: number | null = null;
  private fullRouteCoordinates: GeoJSON.Position[] = [];

  constructor(
    map: maplibregl.Map,
    configuration?: Partial<MapLibreGlDirectionsConfiguration>,
  ) {
    super(map);
    this.map = map;

    this.configuration = buildConfiguration(configuration);
    this.pathFinder = new PathFinder();

    this.init();
  }

  protected init() {
    this.map.addSource(this.configuration.sourceName, {
      type: "geojson",
      data: {
        type: "FeatureCollection",
        features: [],
      },
    });

    this.configuration.layers.forEach((layer) => {
      this.map.addLayer(layer);
    });
  }

  protected get waypointsCoordinates(): [number, number][] {
    return this._waypoints.map((waypoint) => {
      return [
        waypoint.geometry.coordinates[0],
        waypoint.geometry.coordinates[1],
      ];
    });
  }

  protected get snappointsCoordinates(): [number, number][] {
    return this.snappoints.map((snappoint) => {
      return [
        snappoint.geometry.coordinates[0],
        snappoint.geometry.coordinates[1],
      ];
    });
  }

  public get routelinesCoordinates() {
    return this.routelines;
  }

  public get fullRoute() {
    return this.fullRouteCoordinates;
  }

  protected get snaplines() {
    return this.snappoints.length > 1
      ? this.buildSnaplines(
          this.waypointsCoordinates,
          this.snappointsCoordinates,
        )
      : [];
  }

  private calculateDistance(
    coord1: GeoJSON.Position,
    coord2: GeoJSON.Position,
  ) {
    const [lon1, lat1] = coord1;
    const [lon2, lat2] = coord2;
    const R = 6371; // Earth's radius in kilometers
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private findNearestGraphPoint(
    point: GeoJSON.Position,
    coordMap: Map<string, Set<GeoJSON.Position[]>>,
  ): GeoJSON.Position | null {
    let nearest: GeoJSON.Position | null = null;
    let minDistance = Infinity;

    coordMap.forEach((_, coordStr) => {
      const coord = JSON.parse(coordStr);
      const distance = this.calculateDistance(point, coord);
      if (distance < minDistance) {
        minDistance = distance;
        nearest = coord;
      }
    });

    return nearest;
  }

  private updateSnapPoints() {
    this.snappoints = this._waypoints.map((waypoint) => {
      const nearest = this.findNearestGraphPoint(
        waypoint.geometry.coordinates,
        this.coordMap,
      );

      return this.buildPoint(
        (nearest as [number, number]) || waypoint.geometry.coordinates,
        "SNAPPOINT",
      );
    });
  }

  public loadMapData(geoJson: GeoJSON.FeatureCollection) {
    const coordMap = new Map<string, Set<GeoJSON.Position[]>>();
    const graph = new Graph();

    this.coordMap = coordMap;

    // Filter for pedestrian-accessible features
    const walkableFeatures = geoJson.features.filter((feature) => {
      if (feature.geometry.type !== "LineString" || !feature.properties) {
        return false;
      }
      
      // For indoor_routes data, use 'type' property instead of 'feature_type'
      const routeType = feature.properties.type;
      const featureType = feature.properties.feature_type;
      
      // Include corridors, room connections, and other pedestrian paths
      return routeType === "corridor" || 
             routeType === "room_connection" ||
             featureType === "corridor" || 
             featureType === "walkway" || 
             featureType === "path" ||
             featureType === "footway" ||
             featureType === "sidewalk" ||
             (featureType === "unknown" && feature.properties.accessibility !== "no");
    });

    // Debug: Log the types of features being used
    console.log("🚶‍♀️ Walkable features found:", walkableFeatures.length);
    const typeCounts = walkableFeatures.reduce((acc, f) => {
      const type = f.properties?.type || f.properties?.feature_type || 'unknown';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    console.log("📊 Feature types:", JSON.stringify(typeCounts, null, 2));

    walkableFeatures.forEach((feature) => {
      const coordinates = (feature.geometry as GeoJSON.LineString).coordinates;

      coordinates.forEach((coord: GeoJSON.Position) => {
        const key = JSON.stringify(coord);
        if (!coordMap.has(key)) {
          coordMap.set(key, new Set());
        }
        coordMap.get(key)?.add(coordinates);
      });
    });

    walkableFeatures.forEach((feature) => {
      const coordinates = (feature.geometry as GeoJSON.LineString).coordinates;
      const routeType = feature.properties?.type;
      const featureType = feature.properties?.feature_type;

      for (let i = 0; i < coordinates.length - 1; i++) {
        const from = JSON.stringify(coordinates[i]);
        const to = JSON.stringify(coordinates[i + 1]);

        // Calculate base distance
        const distance = this.calculateDistance(
          coordinates[i],
          coordinates[i + 1],
        );

        // Apply pedestrian-friendly weighting
        let weight = distance;
        
        // Prefer corridors and dedicated pedestrian paths from indoor_routes
        if (routeType === "corridor") {
          weight *= 0.5; // Strongly prefer main corridors
        } else if (routeType === "room_connection") {
          weight *= 10.0; // Heavily discourage room connections for transit - use only for final destination access
        } else if (featureType === "corridor") {
          weight *= 0.6; // Prefer corridors from indoor_map
        } else if (featureType === "walkway" || featureType === "footway" || featureType === "path") {
          weight *= 0.7; // Prefer dedicated pedestrian paths
        } else if (featureType === "sidewalk") {
          weight *= 0.8; // Slightly prefer sidewalks
        } else {
          weight *= 1.5; // Discourage unknown/other path types
        }

        graph.addEdge(from, to, weight);

        const fromOverlaps = coordMap.get(from);
        if (fromOverlaps && fromOverlaps.size > 1) {
          fromOverlaps.forEach((otherCoords) => {
            if (otherCoords == coordinates) {
              const idx = otherCoords.findIndex(
                (c) => JSON.stringify(c) === from,
              );
              if (idx !== -1) {
                if (idx > 0) {
                  graph.addEdge(
                    from,
                    JSON.stringify(otherCoords[idx - 1]),
                    weight,
                  );
                }
                if (idx < otherCoords.length - 1) {
                  graph.addEdge(
                    from,
                    JSON.stringify(otherCoords[idx + 1]),
                    weight,
                  );
                }
              }
            }
          });
        }
      }
    });

    this.pathFinder.setGraph(graph);
  }
  /**
   * Replaces all the waypoints with the specified ones and re-fetches the routes.
   *
   * @param waypoints The coordinates at which the waypoints should be added
   */
  public setWaypoints(waypoints: [number, number][]) {
    // Cancel any ongoing animation
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    // this.abortController?.abort();

    this._waypoints = waypoints.map((coord) => buildPoint(coord, "WAYPOINT"));
    this.assignWaypointsCategories();

    const waypointEvent = new IndoorDirectionsWaypointEvent(
      "setwaypoints",
      undefined,
    );

    this.updateSnapPoints();

    this.fire(waypointEvent);
    try {
      this.calculateDirections(waypointEvent);
    } catch (error) {
      console.error(error);
    }
  }

  protected calculateDirections(originalEvent: IndoorDirectionsWaypointEvent) {
    //this.abortController?.abort();

    const routes: GeoJSON.Position[] = [];

    if (this.snappoints.length >= 2) {
      this.fire(
        new IndoorDirectionsRoutingEvent("calculateroutesstart", originalEvent),
      );

      console.log("🗺️ Calculating route between:", this.snappoints[0].geometry.coordinates, "and", this.snappoints[1].geometry.coordinates);

      for (let i = 0; i < this.snappoints.length - 1; i++) {
        const start = this.snappoints[i].geometry.coordinates;
        const end = this.snappoints[i + 1].geometry.coordinates;

        const segmentRoute = this.pathFinder.dijkstra(start, end);
        console.log("🛤️ Segment route found:", segmentRoute.length, "points");
        
        // Debug: Log first few coordinates of the route
        if (segmentRoute.length > 0) {
          console.log("📍 Route starts at:", segmentRoute[0]);
          console.log("📍 Route ends at:", segmentRoute[segmentRoute.length - 1]);
          if (segmentRoute.length > 2) {
            console.log("📍 Route passes through:", segmentRoute.slice(1, Math.min(4, segmentRoute.length - 1)));
          }
        }

        if (i === 0) {
          routes.push(...segmentRoute);
        } else {
          routes.push(...segmentRoute.slice(1));
        }
      }

      console.log("🎯 Final route has", routes.length, "points");

      this.fire(
        new IndoorDirectionsRoutingEvent("calculateroutesend", originalEvent),
      );

      // Store the full route for animation and start animating
      this.fullRouteCoordinates = routes;
      // Clear existing route data and start animation
      this.routelines = [];
      this.animateRouteLine();
    } else {
      // No route to animate
      this.routelines = [];
      this.fullRouteCoordinates = [];
      this.draw();
    }
  }

  private simplifyRoute(coordinates: GeoJSON.Position[], maxPoints: number = 20): GeoJSON.Position[] {
    if (coordinates.length <= maxPoints) {
      return coordinates;
    }
    
    // Always keep start and end points
    const simplified = [coordinates[0]];
    const step = Math.max(1, Math.floor((coordinates.length - 2) / (maxPoints - 2)));
    
    for (let i = step; i < coordinates.length - 1; i += step) {
      simplified.push(coordinates[i]);
    }
    
    // Always include the end point
    simplified.push(coordinates[coordinates.length - 1]);
    
    return simplified;
  }

  private animateRouteLine() {
    // Cancel ongoing animation
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    if (this.fullRouteCoordinates.length < 2) {
      return;
    }

    // Simplify route for better animation performance
    const simplifiedRoute = this.simplifyRoute(this.fullRouteCoordinates, 15);
    console.log(`🎬 Animating route: ${this.fullRouteCoordinates.length} → ${simplifiedRoute.length} points`);

    // Start with empty route and immediately draw to clear previous
    this.routelines = [];
    this.draw();

    const totalDuration = Math.min(2000, 800 + simplifiedRoute.length * 50); // Dynamic duration based on complexity
    const startTime = Date.now();
    let lastFrameTime = startTime;
    
    const animate = () => {
      const now = Date.now();
      const elapsed = now - startTime;
      const deltaTime = now - lastFrameTime;
      lastFrameTime = now;
      
      // Skip frames if we're running too fast (60fps throttle)
      if (deltaTime < 16) {
        this.animationFrameId = requestAnimationFrame(animate);
        return;
      }
      
      const progress = Math.min(elapsed / totalDuration, 1);
      
      // Smooth easing function
      const easedProgress = progress * progress * (3 - 2 * progress); // smoothstep
      
      if (simplifiedRoute.length === 2) {
        // For simple 2-point routes, interpolate between start and end
        const [start, end] = simplifiedRoute;
        const currentEnd: GeoJSON.Position = [
          start[0] + (end[0] - start[0]) * easedProgress,
          start[1] + (end[1] - start[1]) * easedProgress,
        ];
        this.routelines = [this.buildRouteLines([start, currentEnd])];
      } else {
        // For multi-point routes, progressively add points with better interpolation
        const targetIndex = easedProgress * (simplifiedRoute.length - 1);
        const pointIndex = Math.floor(targetIndex);
        const fraction = targetIndex - pointIndex;
        
        if (pointIndex >= simplifiedRoute.length - 1) {
          // Show complete route
          this.routelines = [this.buildRouteLines(simplifiedRoute)];
        } else {
          // Build partial route with smooth interpolation
          const coordinates = simplifiedRoute.slice(0, pointIndex + 1);
          
          // Interpolate to the next point for smoother animation
          if (fraction > 0 && pointIndex + 1 < simplifiedRoute.length) {
            const current = simplifiedRoute[pointIndex];
            const next = simplifiedRoute[pointIndex + 1];
            const interpolated: GeoJSON.Position = [
              current[0] + (next[0] - current[0]) * fraction,
              current[1] + (next[1] - current[1]) * fraction,
            ];
            coordinates.push(interpolated);
          }
          
          this.routelines = [this.buildRouteLines(coordinates)];
        }
      }
      
      this.draw();

      if (progress < 1) {
        this.animationFrameId = requestAnimationFrame(animate);
      } else {
        // Ensure final state shows complete route (using original coordinates for accuracy)
        this.routelines = [this.buildRouteLines(this.fullRouteCoordinates)];
        this.draw();
        this.animationFrameId = null;
      }
    };

    // Start animation on next frame to ensure clear is rendered first
    this.animationFrameId = requestAnimationFrame(animate);
  }

  protected draw() {
    const features = [
      ...this._waypoints,
      ...this.snappoints,
      ...this.snaplines,
      ...this.routelines.flat(),
    ];

    const geoJson: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features,
    };

    if (this.map.getSource(this.configuration.sourceName)) {
      (
        this.map.getSource(
          this.configuration.sourceName,
        ) as maplibregl.GeoJSONSource
      ).setData(geoJson);
    }
  }

  protected assignWaypointsCategories() {
    this._waypoints.forEach((waypoint, index) => {
      let category;
      if (index === 0) {
        category = "ORIGIN";
      } else if (index === this._waypoints.length - 1) {
        category = "DESTINATION";
      } else {
        category = undefined;
      }
      if (waypoint.properties) {
        waypoint.properties.index = index;
        waypoint.properties.category = category;
      }
    });
  }

  /**
   * Clears the map from all the instance's traces: waypoints, snappoints, routes, etc.
   */
  clear() {
    // Cancel any ongoing animation
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    
    this.setWaypoints([]);
    this.routelines = [];
    this.fullRouteCoordinates = [];
  }
}
