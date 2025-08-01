import { LngLatBounds } from "maplibre-gl";

export interface OSMRoutingOptions {
  profile?: 'driving' | 'walking' | 'cycling';
  overview?: 'full' | 'simplified' | 'false';
  geometries?: 'polyline' | 'polyline6' | 'geojson';
  steps?: boolean;
  continue_straight?: boolean;
  waypoints?: number[];
  exclude?: string[];
  approaches?: string[];
  bearings?: number[][];
  radiuses?: number[];
  hints?: string[];
  accessibleRoute?: boolean;
}

export interface OSMRoute {
  distance: number;
  duration: number;
  geometry: GeoJSON.LineString;
  legs: OSMRouteLeg[];
  weight: number;
  weight_name: string;
}

export interface OSMRouteLeg {
  distance: number;
  duration: number;
  steps: OSMRouteStep[];
  summary: string;
  weight: number;
}

export interface OSMRouteStep {
  distance: number;
  duration: number;
  geometry: GeoJSON.LineString;
  name: string;
  ref?: string;
  pronunciation?: string;
  destinations?: string;
  exits?: string;
  mode: string;
  maneuver: OSMManeuver;
  intersections: OSMIntersection[];
}

export interface OSMManeuver {
  location: [number, number];
  bearing_before: number;
  bearing_after: number;
  type: string;
  modifier?: string;
  instruction: string;
}

export interface OSMIntersection {
  location: [number, number];
  bearings: number[];
  entry: boolean[];
  in?: number;
  out?: number;
  lanes?: OSMLane[];
}

export interface OSMLane {
  indications: string[];
  valid: boolean;
}

export interface CrossBuildingRoute {
  indoor: {
    start?: GeoJSON.LineString;
    end?: GeoJSON.LineString;
  };
  outdoor: OSMRoute;
  totalDistance: number;
  totalDuration: number;
  instructions: RouteInstruction[];
}

export interface RouteInstruction {
  type: 'indoor' | 'outdoor' | 'transition';
  text: string;
  distance?: number;
  duration?: number;
  floor?: string;
  building?: string;
  geometry?: GeoJSON.LineString;
}

export interface BuildingEntrance {
  id: string;
  name: string;
  coordinates: [number, number];
  building_id: string;
  floor: string;
  accessibility?: boolean;
}

export default class CrossBuildingNavigationService {
  private routingApiBase: string;
  private indoorDirections: any;
  private buildingEntrances: BuildingEntrance[];

  constructor(routingApiBase: string, indoorDirections: any) {
    this.routingApiBase = routingApiBase;
    this.indoorDirections = indoorDirections;
    this.buildingEntrances = this.loadBuildingEntrances();
  }

  /**
   * Find route between two points that may be in different buildings
   */
  async findCrossBuildingRoute(
    start: [number, number] | { coordinates: [number, number], building?: string, floor?: string },
    end: [number, number] | { coordinates: [number, number], building?: string, floor?: string },
    options: OSMRoutingOptions = {}
  ): Promise<CrossBuildingRoute> {
    console.log('findCrossBuildingRoute called with:', { start, end, options });
    
    const startCoord = Array.isArray(start) ? start : start.coordinates;
    const endCoord = Array.isArray(end) ? end : end.coordinates;
    const startBuilding = Array.isArray(start) ? null : start.building;
    const endBuilding = Array.isArray(end) ? null : end.building;

    console.log('Processed coordinates:', { startCoord, endCoord, startBuilding, endBuilding });

    // Detect buildings from coordinates if not explicitly provided
    const detectedStartBuilding = startBuilding || this.detectBuildingFromCoordinate(startCoord);
    const detectedEndBuilding = endBuilding || this.detectBuildingFromCoordinate(endCoord);

    console.log('Building detection:', { detectedStartBuilding, detectedEndBuilding });

    // If both points are in the same building, use indoor routing only
    if (detectedStartBuilding && detectedEndBuilding && detectedStartBuilding === detectedEndBuilding) {
      console.log(`Same building detected (${detectedStartBuilding}), using indoor-only route`);
      return this.getIndoorOnlyRoute(start, end);
    }

    // Check if either point is actually within a building (indoor POI)
    const startIsIndoor = detectedStartBuilding;
    const endIsIndoor = detectedEndBuilding;

    console.log('Building detection:', { startIsIndoor, endIsIndoor });

    // If neither point is in a building, just do outdoor routing
    if (!startIsIndoor && !endIsIndoor) {
      console.log('Both points are outdoor, using direct outdoor route');
      try {
        const outdoorRoute = await this.getOutdoorRoute(startCoord, endCoord, options);
        return {
          indoor: {},
          outdoor: outdoorRoute,
          totalDistance: outdoorRoute.distance,
          totalDuration: outdoorRoute.duration,
          instructions: this.createOutdoorInstructions(outdoorRoute)
        };
      } catch (error) {
        console.error('Failed to get outdoor route between outdoor points:', error);
        throw new Error('Unable to calculate outdoor route. Please check your internet connection and try again.');
      }
    }

    // Find appropriate start and end points for outdoor routing
    let routeStartCoord = startCoord;
    let routeEndCoord = endCoord;

    // If start is indoor, route from building entrance
    if (startIsIndoor) {
      const startEntrance = this.findNearestEntrance(startCoord, startIsIndoor);
      routeStartCoord = startEntrance.coordinates;
    }

    // If end is indoor, route to building entrance
    if (endIsIndoor) {
      const endEntrance = this.findNearestEntrance(endCoord, endIsIndoor);
      routeEndCoord = endEntrance.coordinates;
    }

    console.log('Route coordinates:', { routeStartCoord, routeEndCoord });

    // Try to get outdoor route, with better error handling
    let outdoorRoute: OSMRoute;
    try {
      outdoorRoute = await this.getOutdoorRoute(routeStartCoord, routeEndCoord, options);
    } catch (error) {
      console.error('Failed to get outdoor route for cross-building navigation:', error);
      throw new Error('Unable to calculate outdoor route between buildings. Please check your internet connection and try again.');
    }

    const route: CrossBuildingRoute = {
      indoor: {},
      outdoor: outdoorRoute,
      totalDistance: 0,
      totalDuration: 0,
      instructions: []
    };

    console.log('Outdoor route calculated:', route.outdoor);

    // Add indoor route from start to building entrance (if needed)
    if (startIsIndoor && routeStartCoord !== startCoord) {
      try {
        const indoorStart = this.getIndoorRoute(startCoord, routeStartCoord);
        if (indoorStart) {
          route.indoor.start = indoorStart;
          route.instructions.push({
            type: 'indoor',
            text: `Navigate inside ${startIsIndoor} to building exit`,
            building: startIsIndoor,
            floor: Array.isArray(start) ? undefined : start.floor,
            geometry: indoorStart
          });
        }
      } catch (error) {
        console.warn('Could not generate indoor start route:', error);
      }
    }

    // Add transition instruction (if coming from indoor)
    if (startIsIndoor) {
      route.instructions.push({
        type: 'transition',
        text: `Exit ${startIsIndoor || 'building'} and head towards ${endIsIndoor ? endIsIndoor : 'destination'}`,
      });
    }

    // Add outdoor route instructions
    route.instructions.push(...this.createOutdoorInstructions(route.outdoor));

    // Add indoor route from building entrance to end (if needed)
    if (endIsIndoor && routeEndCoord !== endCoord) {
      try {
        const indoorEnd = this.getIndoorRoute(routeEndCoord, endCoord);
        if (indoorEnd) {
          route.indoor.end = indoorEnd;
          route.instructions.push({
            type: 'transition',
            text: `Enter ${endIsIndoor}`,
          });
          route.instructions.push({
            type: 'indoor',
            text: `Navigate inside ${endIsIndoor} to your destination`,
            building: endIsIndoor,
            floor: Array.isArray(end) ? undefined : end.floor,
            geometry: indoorEnd
          });
        }
      } catch (error) {
        console.warn('Could not generate indoor end route:', error);
      }
    }

    // Calculate totals
    route.totalDistance = route.outdoor.distance +
      (route.indoor.start ? this.calculateDistance(route.indoor.start.coordinates as [number, number][]) : 0) +
      (route.indoor.end ? this.calculateDistance(route.indoor.end.coordinates as [number, number][]) : 0);

    route.totalDuration = route.outdoor.duration +
      (route.indoor.start ? this.estimateIndoorDuration(route.indoor.start) : 0) +
      (route.indoor.end ? this.estimateIndoorDuration(route.indoor.end) : 0);

    console.log('Final route calculated:', {
      totalDistance: route.totalDistance,
      totalDuration: route.totalDuration,
      outdoorDistance: route.outdoor.distance,
      outdoorDuration: route.outdoor.duration,
      instructionsCount: route.instructions.length
    });

    return route;
  }

  /**
   * Create outdoor route instructions from OSRM route
   */
  private createOutdoorInstructions(outdoorRoute: OSMRoute): RouteInstruction[] {
    const instructions: RouteInstruction[] = [];
    
    if (outdoorRoute.legs) {
      outdoorRoute.legs.forEach((leg, legIndex) => {
        leg.steps.forEach((step, stepIndex) => {
          instructions.push({
            type: 'outdoor',
            text: step.maneuver.instruction,
            distance: step.distance,
            duration: step.duration,
            geometry: step.geometry
          });
        });
      });
    }
    
    return instructions;
  }

  /**
   * Get outdoor route using OpenStreetMap routing service
   */
  private async getOutdoorRoute(
    start: [number, number],
    end: [number, number],
    options: OSMRoutingOptions = {}
  ): Promise<OSMRoute> {
    // Always use walking profile for pedestrian navigation
    const profile = 'walking';
    const baseUrl = `${this.routingApiBase}/${profile}`;
    
    const params = new URLSearchParams({
      overview: options.overview || 'full',
      geometries: 'geojson',
      steps: 'true',
      continue_straight: options.continue_straight?.toString() || 'default',
      // Don't request alternatives - they can cause contamination and random extra sections
      alternatives: 'false',
      // Use annotations to get more detailed route info
      annotations: 'true',
      // Remove exclude parameter - let OSRM use its default walking routing
      // approaches: 'unrestricted;unrestricted' // Also remove this as it might cause issues
    });

    const url = `${baseUrl}/${start[0]},${start[1]};${end[0]},${end[1]}?${params}`;
    console.log('Fetching pedestrian-friendly outdoor route from:', url);

    try {
      const response = await fetch(url);
      console.log('OSRM API response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('OSRM API error response:', errorText);
        console.log('🚨 OSRM API failed, throwing error instead of fallback');
        throw new Error(`Routing API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('OSRM API response data:', data);
      
      if (!data.routes || data.routes.length === 0) {
        console.error('No routes found in response:', data);
        console.log('🚨 No routes in response, throwing error instead of fallback');
        throw new Error('No route found');
      }

      console.log('✅ OSRM API succeeded, processing primary route...');

      // Use only the primary route to avoid contamination from alternatives
      let route = data.routes[0];
      console.log(`� Using primary route: distance=${route.distance}m, duration=${route.duration}s`);
      
      // Validate route geometry to ensure it doesn't contain invalid sections
      if (!route.geometry || !route.geometry.coordinates || route.geometry.coordinates.length < 2) {
        console.error('Invalid route geometry received:', route.geometry);
        throw new Error('Invalid route geometry');
      }
      
      // Check for suspiciously short routes that might be direct lines
      const straightLineDistance = this.calculateHaversineDistance(start, end);
      if (route.distance < straightLineDistance * 0.9) {
        console.warn('Route distance suspiciously short compared to straight-line distance:', {
          routeDistance: route.distance,
          straightLineDistance: straightLineDistance
        });
      }
      
      // Apply realistic timing adjustments to OSRM route
      route = this.adjustRouteTimingForRealism(route);
      
      console.log('Selected route with adjusted timing:', route);
      return route;
    } catch (error) {
      console.error('Error fetching outdoor route:', error);
      
      // Instead of creating a fallback route, re-throw the error
      // This prevents random direct lines from appearing on the map
      throw new Error(`Failed to get outdoor route: ${error}`);
    }
  }

  /**
   * Adjust OSRM route timing to be more realistic for walking
   */
  private adjustRouteTimingForRealism(route: OSMRoute): OSMRoute {
    // Apply realistic walking speed and buffer time
    const baseSpeedAdjustment = 1.4; // OSRM walking speed is too optimistic, slow it down
    const bufferTime = 300; // 5 minutes buffer
    
    // Adjust main route duration
    const adjustedDuration = (route.duration * baseSpeedAdjustment) + bufferTime;
    
    // Adjust legs and steps durations proportionally
    const durationMultiplier = adjustedDuration / route.duration;
    
    const adjustedLegs = route.legs.map(leg => ({
      ...leg,
      duration: leg.duration * durationMultiplier,
      steps: leg.steps.map(step => ({
        ...step,
        duration: step.duration * durationMultiplier
      }))
    }));
    
    return {
      ...route,
      duration: adjustedDuration,
      legs: adjustedLegs,
      weight: adjustedDuration
    };
  }

  /**
   * Get indoor-only route for same building navigation
   */
  private async getIndoorOnlyRoute(
    start: [number, number] | { coordinates: [number, number], building?: string, floor?: string },
    end: [number, number] | { coordinates: [number, number], building?: string, floor?: string }
  ): Promise<CrossBuildingRoute> {
    const startCoord = Array.isArray(start) ? start : start.coordinates;
    const endCoord = Array.isArray(end) ? end : end.coordinates;

    console.log('🏠 Getting indoor-only route from', startCoord, 'to', endCoord);

    const indoorRoute = this.getIndoorRoute(startCoord, endCoord);
    
    if (!indoorRoute) {
      console.warn('❌ No indoor route found between coordinates');
    } else {
      console.log('✅ Indoor route found with geometry:', indoorRoute);
    }
    
    const totalDistance = indoorRoute ? this.calculateDistance(indoorRoute.coordinates as [number, number][]) : 0;
    const totalDuration = indoorRoute ? this.estimateIndoorDuration(indoorRoute) : 0;
    
    console.log('🛤️ Indoor route calculated:', { 
      hasRoute: !!indoorRoute, 
      distance: totalDistance, 
      duration: totalDuration,
      coordinateCount: indoorRoute?.coordinates?.length || 0
    });
    
    return {
      indoor: {
        start: indoorRoute || undefined
      },
      outdoor: {
        distance: 0,
        duration: 0,
        geometry: { type: 'LineString', coordinates: [] },
        legs: [],
        weight: 0,
        weight_name: 'duration'
      },
      totalDistance,
      totalDuration,
      instructions: [{
        type: 'indoor',
        text: 'Navigate to your destination',
        distance: totalDistance,
        duration: totalDuration,
        geometry: indoorRoute || undefined
      }]
    };
  }

  /**
   * Get indoor route using existing indoor directions system
   */
  private getIndoorRoute(start: [number, number], end: [number, number]): GeoJSON.LineString | null {
    try {
      if (!this.indoorDirections) {
        console.warn('Indoor directions instance not available');
        return null;
      }

      console.log('🏠 Setting waypoints for indoor navigation:', { start, end });
      this.indoorDirections.setWaypoints([start, end]);
      
      // Try to get the route from fullRoute directly since that's populated immediately
      const fullRouteCoordinates = this.indoorDirections.fullRoute;
      console.log('🛤️ Full route coordinates:', {
        fullRouteLength: fullRouteCoordinates?.length,
        coordinates: fullRouteCoordinates
      });
      
      // Also check the routelines to see if they're populated
      const routeLines = this.indoorDirections.routelinesCoordinates;
      console.log('📊 Route lines status:', {
        routeLinesLength: routeLines?.length,
        firstRouteLines: routeLines?.[0]?.length
      });
      
      if (fullRouteCoordinates && fullRouteCoordinates.length >= 2) {
        // Create a LineString geometry from the full route coordinates
        const routeGeometry: GeoJSON.LineString = {
          type: 'LineString',
          coordinates: fullRouteCoordinates
        };
        console.log('📍 Created route geometry from fullRoute:', routeGeometry);
        return routeGeometry;
      }
      
      // Fallback: try the original method
      const routeCoordinates = this.indoorDirections.routelinesCoordinates;
      console.log('🛤️ Indoor route coordinates result (fallback):', {
        routeCoordinatesLength: routeCoordinates?.length,
        firstRoute: routeCoordinates?.[0]?.length,
        fullResult: routeCoordinates
      });
      
      const routeGeometry = routeCoordinates[0]?.[0]?.geometry;
      console.log('📍 Indoor route geometry (fallback):', routeGeometry);
      
      return routeGeometry || null;
    } catch (error) {
      console.error('Indoor routing failed with error:', error);
      return null;
    }
  }

  /**
   * Find the nearest building entrance for a given coordinate
   */
  private findNearestEntrance(coord: [number, number], buildingId?: string): BuildingEntrance {
    let availableEntrances = this.buildingEntrances;
    
    // If no building specified, try to detect building from coordinate
    if (!buildingId) {
      const detectedBuilding = this.detectBuildingFromCoordinate(coord);
      if (detectedBuilding) {
        buildingId = detectedBuilding;
      }
      console.log(`Detected building "${buildingId || 'none'}" for coordinate [${coord[0]}, ${coord[1]}]`);
    }
    
    // Filter by building if specified/detected
    if (buildingId) {
      const buildingEntrances = availableEntrances.filter(e => e.building_id === buildingId);
      if (buildingEntrances.length > 0) {
        availableEntrances = buildingEntrances;
        console.log(`Using ${buildingEntrances.length} entrances for building ${buildingId}`);
      } else {
        console.log(`No entrances found for building ${buildingId}, using all entrances`);
      }
    }

    // Find closest entrance
    let closest = availableEntrances[0];
    let minDistance = this.getDistanceToEntrance(coord, closest.coordinates);

    for (const entrance of availableEntrances.slice(1)) {
      const distance = this.getDistanceToEntrance(coord, entrance.coordinates);
      if (distance < minDistance) {
        minDistance = distance;
        closest = entrance;
      }
    }

    console.log(`Selected entrance: ${closest.name} (${closest.id}) for building ${closest.building_id}`);
    return closest;
  }

  /**
   * Detect which building a coordinate belongs to based on proximity and known locations
   * Returns null for outdoor/external coordinates
   */
  private detectBuildingFromCoordinate(coord: [number, number]): string | null {
    // Only detect building if coordinate is very close to known building areas
    // This prevents outdoor locations from being treated as indoor locations
    
    const longitude = coord[0];
    const latitude = coord[1];
    
    // Use a smaller, more precise detection area for each building
    // Only return building ID if the coordinate is clearly inside the building
    
    // Healy Hall (more precise bounds)
    if (longitude > -77.0723 && longitude < -77.0715 && latitude > 38.9072 && latitude < 38.9080) {
      return 'healy';
    }
    
    // Darnall Hall (more precise bounds)
    if (longitude > -77.0740 && longitude < -77.0730 && latitude > 38.9110 && latitude < 38.9118) {
      return 'darnall';
    }
    
    // Reiss Science Building (based on generated routes coordinate range)
    if (longitude > -77.074281 && longitude < -77.072698 && latitude > 38.908721 && latitude < 38.910237) {
      return 'reiss';
    }
    
    // Lauinger Library (more precise bounds)
    if (longitude > -77.0730 && longitude < -77.0720 && latitude > 38.9076 && latitude < 38.9084) {
      return 'lauinger';
    }
    
    // Default: return null for outdoor/external coordinates
    // This ensures most OSM locations are treated as outdoor destinations
    return null;
  }

  /**
   * Calculate distance between two coordinates (simple Euclidean for short distances)
   */
  private getDistanceToEntrance(coord1: [number, number], coord2: [number, number]): number {
    const dx = coord1[0] - coord2[0];
    const dy = coord1[1] - coord2[1];
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Calculate Haversine distance between two coordinates in meters
   */
  private calculateHaversineDistance(coord1: [number, number], coord2: [number, number]): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = coord1[1] * Math.PI/180;
    const φ2 = coord2[1] * Math.PI/180;
    const Δφ = (coord2[1]-coord1[1]) * Math.PI/180;
    const Δλ = (coord2[0]-coord1[0]) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
  }

  /**
   * Calculate bearing between two coordinates
   */
  private calculateBearing(coord1: [number, number], coord2: [number, number]): number {
    const φ1 = coord1[1] * Math.PI/180;
    const φ2 = coord2[1] * Math.PI/180;
    const Δλ = (coord2[0]-coord1[0]) * Math.PI/180;

    const y = Math.sin(Δλ) * Math.cos(φ2);
    const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);

    const θ = Math.atan2(y, x);

    return (θ * 180/Math.PI + 360) % 360;
  }

  /**
   * Calculate total distance of a line string in meters
   */
  private calculateDistance(coordinates: [number, number][]): number {
    let total = 0;
    for (let i = 1; i < coordinates.length; i++) {
      total += this.calculateHaversineDistance(coordinates[i-1], coordinates[i]);
    }
    return total; // Already in meters from Haversine calculation
  }

  /**
   * Estimate indoor walking duration (assuming 1.0 m/s walking speed + buffer)
   */
  private estimateIndoorDuration(route: GeoJSON.LineString): number {
    const distance = this.calculateDistance(route.coordinates as [number, number][]);
    const baseDuration = distance / 1.0; // 1.0 m/s indoor walking speed (slower for navigation)
    return baseDuration + 60; // Add 1 minute buffer for finding locations indoors
  }

  /**
   * Load building entrances (this should come from your data)
   */
  private loadBuildingEntrances(): BuildingEntrance[] {
    // This should be loaded from your building data
    // For now, return example entrances for the main buildings
    return [
      // Darnall Hall
      {
        id: 'darnall_main',
        name: 'Darnall Hall Main Entrance',
        coordinates: [-77.0736, 38.9113],
        building_id: 'darnall',
        floor: 'G',
        accessibility: true
      },
      {
        id: 'darnall_side',
        name: 'Darnall Hall Side Entrance',
        coordinates: [-77.0735, 38.9115],
        building_id: 'darnall',
        floor: 'G',
        accessibility: false
      },
      // Reiss Science Building
      {
        id: 'reiss_main',
        name: 'Reiss Science Building Main Entrance',
        coordinates: [-77.073485, 38.909537], // Near the building POI coordinate
        building_id: 'reiss',
        floor: 'G',
        accessibility: true
      },
      {
        id: 'reiss_north',
        name: 'Reiss Science Building North Entrance',
        coordinates: [-77.073498, 38.909658], // Near door coordinate
        building_id: 'reiss',
        floor: 'G',
        accessibility: false
      },
      // Healy Hall
      {
        id: 'healy_main',
        name: 'Healy Hall Main Entrance',
        coordinates: [-77.0719, 38.9076],
        building_id: 'healy',
        floor: 'G',
        accessibility: true
      },
      {
        id: 'healy_south',
        name: 'Healy Hall South Entrance',
        coordinates: [-77.0720, 38.9074],
        building_id: 'healy',
        floor: 'G',
        accessibility: false
      },
      // Lauinger Library
      {
        id: 'lauinger_main',
        name: 'Lauinger Library Main Entrance',
        coordinates: [-77.0725, 38.908],
        building_id: 'lauinger',
        floor: 'G',
        accessibility: true
      },
      {
        id: 'lauinger_east',
        name: 'Lauinger Library East Entrance',
        coordinates: [-77.0723, 38.9081],
        building_id: 'lauinger',
        floor: 'G',
        accessibility: false
      }
    ];
  }

  /**
   * Add a new building entrance
   */
  public addBuildingEntrance(entrance: BuildingEntrance) {
    this.buildingEntrances.push(entrance);
  }

  /**
   * Get route bounds for map viewport adjustment
   */
  public getRouteBounds(route: CrossBuildingRoute): LngLatBounds {
    const coordinates: [number, number][] = [];

    // Add outdoor route coordinates
    if (route.outdoor.geometry.coordinates.length > 0) {
      coordinates.push(...route.outdoor.geometry.coordinates as [number, number][]);
    }

    // Add indoor route coordinates
    if (route.indoor.start?.coordinates.length) {
      coordinates.push(...route.indoor.start.coordinates as [number, number][]);
    }
    if (route.indoor.end?.coordinates.length) {
      coordinates.push(...route.indoor.end.coordinates as [number, number][]);
    }

    if (coordinates.length === 0) {
      throw new Error('No route coordinates available');
    }

    let bounds = new LngLatBounds(coordinates[0], coordinates[0]);
    for (const coord of coordinates) {
      bounds = bounds.extend(coord);
    }

    return bounds;
  }
}
