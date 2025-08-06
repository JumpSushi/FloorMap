/**
 * Concept3D Official Wayfinding API Service
 * 
 * This service integrates with the official Concept3D wayfinding API for outdoor directions.
 * The API provides comprehensive outdoor routing with detailed turn-by-turn directions.
 */

export interface Concept3DWayfindingOptions {
  map?: string;
  stamp?: string;
  fromLevel?: number;
  toLevel?: number;
  currentLevel?: number;
  mode?: 'walking' | 'driving' | 'cycling';
  getThirdParty?: boolean;
  mapType?: 'mapboxgl' | 'leaflet';
  key?: string;
}

export interface Concept3DRoute {
  distance: number; // Total distance in meters
  duration: number; // Total duration in seconds
  formattedDuration: string; // Human readable duration (e.g., "7 mins")
  bbox: [number, number][]; // Bounding box coordinates for the route
  route: Concept3DRouteSegment[];
  pivotPoints: [number, number][]; // Key turning points
  fullPath: [number, number][]; // Complete route coordinates
  provider: string; // Routing provider (e.g., "mapbox")
  directionsType: string; // Type of directions (e.g., "walking")
}

export interface Concept3DRouteSegment {
  distance: number;
  formattedDistance: string;
  duration: number;
  formattedDuration: string;
  modifier: string; // Direction modifier (e.g., "start", "left", "right", "straight")
  type: string; // Segment type (e.g., "start", "turn", "arrive")
  action: string; // Human readable action/instruction
  route: [number, number][]; // Coordinates for this segment
  level: number; // Floor/level number
  directionsType: string; // Type of directions
}

export interface Concept3DWayfindingResponse {
  routes: Concept3DRoute[];
  parking: any | null; // Parking information if available
  status: string; // Response status
  stamp: string; // Request identifier
}

export class Concept3DWayfindingService {
  private readonly apiBase = 'https://api.concept3d.com/wayfinding/v2';
  private readonly defaultOptions: Concept3DWayfindingOptions = {
    map: '999', // Default map ID - should be configured per implementation
    stamp: 'NOU5Cneg', // Default stamp - should be unique per request
    fromLevel: 0,
    toLevel: 0,
    currentLevel: 0,
    mode: 'walking',
    getThirdParty: true,
    mapType: 'mapboxgl',
    key: '0001085cc708b9cef47080f064612ca5' // Default API key - should be configured
  };

  constructor(options?: Partial<Concept3DWayfindingOptions>) {
    this.defaultOptions = { ...this.defaultOptions, ...options };
  }

  /**
   * Get outdoor directions between two points using Concept3D API
   */
  async getDirections(
    from: [number, number], // [longitude, latitude]
    to: [number, number],   // [longitude, latitude]
    options?: Partial<Concept3DWayfindingOptions>
  ): Promise<Concept3DRoute> {
    const requestOptions = { ...this.defaultOptions, ...options };
    
    // Build the API URL with parameters
    const params = new URLSearchParams({
      map: requestOptions.map!,
      stamp: requestOptions.stamp!,
      fromLevel: requestOptions.fromLevel!.toString(),
      toLevel: requestOptions.toLevel!.toString(),
      currentLevel: requestOptions.currentLevel!.toString(),
      toLat: to[1].toString(),
      toLng: to[0].toString(),
      fromLat: from[1].toString(),
      fromLng: from[0].toString(),
      mode: requestOptions.mode!,
      getThirdParty: requestOptions.getThirdParty!.toString(),
      mapType: requestOptions.mapType!,
      key: requestOptions.key!
    });

    const url = `${this.apiBase}?${params.toString()}`;
    
    console.log('🗺️ Requesting Concept3D directions:', url);

    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Concept3D API error:', response.status, errorText);
        throw new Error(`Concept3D API error: ${response.status} - ${errorText}`);
      }

      const data: Concept3DWayfindingResponse = await response.json();
      
      console.log('✅ Concept3D API response:', data);

      if (data.status !== 'ok') {
        throw new Error(`Concept3D API returned status: ${data.status}`);
      }

      if (!data.routes || data.routes.length === 0) {
        throw new Error('No routes found in Concept3D response');
      }

      // Return the primary route
      const primaryRoute = data.routes[0];
      
      // Validate the route has proper geometry
      if (!primaryRoute.fullPath || primaryRoute.fullPath.length < 2) {
        throw new Error('Invalid route geometry from Concept3D API');
      }

      // Fix coordinate order if needed - Concept3D might return [lat, lng] but we need [lng, lat]
      const correctedRoute = this.validateAndCorrectCoordinates(primaryRoute);

      console.log('🛤️ Concept3D route details:', {
        distance: correctedRoute.distance,
        duration: correctedRoute.duration,
        segments: correctedRoute.route.length,
        pathPoints: correctedRoute.fullPath.length,
        firstCoord: correctedRoute.fullPath[0],
        lastCoord: correctedRoute.fullPath[correctedRoute.fullPath.length - 1],
        sampleMidCoord: correctedRoute.fullPath[Math.floor(correctedRoute.fullPath.length / 2)]
      });

      return correctedRoute;
    } catch (error) {
      console.error('Failed to get Concept3D directions:', error);
      throw error;
    }
  }

  /**
   * Convert Concept3D route to GeoJSON LineString format
   */
  routeToGeoJSON(route: Concept3DRoute): GeoJSON.LineString {
    return {
      type: 'LineString',
      coordinates: route.fullPath
    };
  }

  /**
   * Validate and correct coordinate order from Concept3D API
   * Concept3D might return [lat, lng] but GeoJSON standard is [lng, lat]
   */
  private validateAndCorrectCoordinates(route: Concept3DRoute): Concept3DRoute {
    // Check if coordinates need to be swapped by examining the first coordinate
    const firstCoord = route.fullPath[0];
    const isLatLngOrder = this.isLatLngOrder(firstCoord);
    
    console.log('🔍 Coordinate analysis:', {
      firstCoord,
      detectedOrder: isLatLngOrder ? '[lat, lng]' : '[lng, lat]',
      needsConversion: isLatLngOrder
    });
    
    if (isLatLngOrder) {
      console.log('🔄 Converting coordinates from [lat, lng] to [lng, lat]');
      
      // Correct fullPath coordinates
      const correctedFullPath = route.fullPath.map(coord => [coord[1], coord[0]] as [number, number]);
      
      // Correct route segment coordinates
      const correctedRouteSegments = route.route.map(segment => ({
        ...segment,
        route: segment.route.map(coord => [coord[1], coord[0]] as [number, number])
      }));
      
      // Correct bbox coordinates
      const correctedBbox = route.bbox.map(coord => [coord[1], coord[0]] as [number, number]);
      
      // Correct pivot points
      const correctedPivotPoints = route.pivotPoints.map(coord => [coord[1], coord[0]] as [number, number]);
      
      const correctedRoute = {
        ...route,
        fullPath: correctedFullPath,
        route: correctedRouteSegments,
        bbox: correctedBbox,
        pivotPoints: correctedPivotPoints
      };
      
      // Validate the corrected coordinates
      this.validateCoordinateBounds(correctedRoute.fullPath);
      
      return correctedRoute;
    }
    
    console.log('✅ Coordinates are already in [lng, lat] order');
    // Still validate bounds even if no conversion needed
    this.validateCoordinateBounds(route.fullPath);
    return route;
  }

  /**
   * Validate that coordinates are within reasonable bounds for Georgetown University area
   */
  private validateCoordinateBounds(coordinates: [number, number][]): void {
    const georgetownBounds = {
      minLng: -77.1, maxLng: -77.0,
      minLat: 38.85, maxLat: 38.95
    };
    
    const sampleCoords = coordinates.slice(0, 5); // Check first 5 coordinates
    
    for (const [lng, lat] of sampleCoords) {
      if (lng < georgetownBounds.minLng || lng > georgetownBounds.maxLng ||
          lat < georgetownBounds.minLat || lat > georgetownBounds.maxLat) {
        console.warn('⚠️ Coordinate outside Georgetown bounds:', { lng, lat });
        console.warn('Expected bounds:', georgetownBounds);
      }
    }
    
    console.log('📍 Coordinate bounds validation completed');
  }

  /**
   * Determine if coordinates are in [lat, lng] order by checking if first value is latitude
   * Georgetown University coordinates: lat ~38.9, lng ~-77.0
   */
  private isLatLngOrder(coord: [number, number]): boolean {
    const [first, second] = coord;
    
    console.log('🔍 Analyzing coordinate order for:', coord);
    
    // Georgetown area bounds check
    // If first coordinate is positive and in lat range (~38-39) and second is negative lng (~-77 to -76)
    // then it's likely [lat, lng] order
    const isFirstValueLatitude = first > 35 && first < 45; // Reasonable latitude range for Georgetown
    const isSecondValueLongitude = second < -70 && second > -80; // Reasonable longitude range for Georgetown
    
    // If first coordinate is negative (longitude) and second is positive (latitude)
    const isFirstValueLongitude = first < -70 && first > -80;
    const isSecondValueLatitude = second > 35 && second < 45;
    
    console.log('📍 Coordinate analysis:', {
      first, second,
      isFirstValueLatitude, isSecondValueLongitude,
      isFirstValueLongitude, isSecondValueLatitude
    });
    
    if (isFirstValueLatitude && isSecondValueLongitude) {
      console.log('✅ Detected [lat, lng] order - needs conversion');
      return true; // [lat, lng] order detected
    }
    
    if (isFirstValueLongitude && isSecondValueLatitude) {
      console.log('✅ Detected [lng, lat] order - correct format');
      return false; // [lng, lat] order (correct GeoJSON format)
    }
    
    // Fallback: if we can't determine clearly, log a warning but assume current order
    console.warn('⚠️ Cannot determine coordinate order clearly for:', coord, 'assuming [lng, lat]');
    return false; // Assume [lng, lat] by default
  }

  /**
   * Convert Concept3D route to OSM-compatible format for existing systems
   */
  routeToOSMFormat(route: Concept3DRoute): {
    distance: number;
    duration: number;
    geometry: GeoJSON.LineString;
    legs: any[];
    weight: number;
    weight_name: string;
  } {
    return {
      distance: route.distance,
      duration: route.duration,
      geometry: this.routeToGeoJSON(route),
      legs: route.route.map(segment => ({
        distance: segment.distance,
        duration: segment.duration,
        steps: [{
          distance: segment.distance,
          duration: segment.duration,
          geometry: {
            type: 'LineString',
            coordinates: segment.route
          } as GeoJSON.LineString,
          name: segment.action,
          mode: segment.directionsType,
          maneuver: {
            location: segment.route[0],
            bearing_before: 0,
            bearing_after: 0,
            type: segment.type,
            modifier: segment.modifier,
            instruction: segment.action
          },
          intersections: []
        }],
        summary: segment.action,
        weight: segment.distance
      })),
      weight: route.distance,
      weight_name: 'distance'
    };
  }

  /**
   * Extract turn-by-turn instructions from Concept3D route
   */
  getInstructions(route: Concept3DRoute): string[] {
    return route.route.map(segment => 
      `${segment.action} (${segment.formattedDistance}, ${segment.formattedDuration})`
    );
  }

  /**
   * Generate a unique stamp for requests (optional, for tracking)
   */
  generateStamp(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}

export default Concept3DWayfindingService;
