import MiniSearch, { SearchResult } from "minisearch";
import { POI } from "~/types/poi";
import config from "~/config";

interface POIProperties {
  id: number;
  name: string;
  type: string;
  floor: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata: Record<string, any>;
  building_id: string;
}

export interface POIFeature extends GeoJSON.Feature<GeoJSON.Point> {
  properties: POIProperties;
}

// OpenStreetMap location interface
export interface OSMLocation {
  place_id: number;
  licence: string;
  osm_type: string;
  osm_id: number;
  lat: string;
  lon: string;
  display_name: string;
  address: any;
  boundingbox: string[];
  importance: number;
  place_rank: number;
  category: string;
  type: string;
}

/**
 * Enhanced IndoorGeocoder that supports both indoor POIs and OpenStreetMap locations
 */
export class EnhancedIndoorGeocoder {
  private miniSearch: MiniSearch;
  private cutoffThreshold: number;
  private osmCache: Map<string, OSMLocation[]> = new Map();

  constructor(pois: POIFeature[], cutoffThreshold: number = 0.3) {
    this.cutoffThreshold = cutoffThreshold;
    this.miniSearch = new MiniSearch({
      fields: ["name"],
      storeFields: ["name", "type", "geometry", "id", "source"],
    });

    // Filter out room POIs from search index (keep them visible but not searchable)
    const searchablePOIs = pois.filter(poi => poi.properties.type !== 'dorm_room');
    
    const flattenPOIs = searchablePOIs.map((feature: POIFeature) => ({
      ...feature.properties,
      geometry: feature.geometry,
      source: 'indoor' // Mark as indoor POI
    }));

    this.miniSearch.addAll(flattenPOIs);
  }

  /**
   * Search for locations using both indoor POIs and OpenStreetMap
   */
  public async getEnhancedAutocompleteResults(
    query: string,
    maxResults: number = 8,
    includeOSM: boolean = true
  ): Promise<Array<POI & { source?: string; address?: string }>> {
    if (!query) return [];

    // Get indoor POI results
    const indoorResults = this.getIndoorResults(query);
    
    // Get OpenStreetMap results if enabled
    let osmResults: Array<POI & { source: string; address: string }> = [];
    if (includeOSM) {
      osmResults = await this.getOSMResults(query);
    }

    // Combine and rank results
    const combinedResults = [
      ...indoorResults.map(poi => ({ ...poi, source: 'indoor' })),
      ...osmResults
    ];

    // Prioritize indoor POIs, then OSM results by relevance
    const sortedResults = combinedResults.sort((a, b) => {
      // Indoor POIs get priority
      if (a.source === 'indoor' && b.source !== 'indoor') return -1;
      if (b.source === 'indoor' && a.source !== 'indoor') return 1;
      
      // For OSM results, sort by name similarity
      const aMatch = a.name.toLowerCase().includes(query.toLowerCase());
      const bMatch = b.name.toLowerCase().includes(query.toLowerCase());
      if (aMatch && !bMatch) return -1;
      if (bMatch && !aMatch) return 1;
      
      return 0;
    });

    return sortedResults.slice(0, maxResults);
  }

  /**
   * Get indoor POI results (original functionality)
   */
  private getIndoorResults(query: string, maxResults: number = 3): Array<POI> {
    const results = this.miniSearch.search(query, { prefix: true });
    if (results.length === 0) return [];

    const topScore = results[0].score;
    const cutoffIndex = this.getCutoffIndex(results, topScore);

    const relevantResults =
      cutoffIndex > 0 ? results.slice(0, cutoffIndex) : results.slice(0, 3);

    return relevantResults
      .map((result) => ({
        id: result.id,
        name: result.name,
        coordinates: result.geometry.coordinates,
      }))
      .slice(0, maxResults);
  }

  /**
   * Get OpenStreetMap location results
   */
  private async getOSMResults(query: string): Promise<Array<POI & { source: string; address: string }>> {
    // Check cache first
    if (this.osmCache.has(query)) {
      const cached = this.osmCache.get(query)!;
      return this.convertOSMToPOI(cached);
    }

    try {
      // Use our server-side API to avoid CORS issues
      const params = new URLSearchParams({
        q: query
      });

      const response = await fetch(`/api/geocode?${params}`);
      
      if (!response.ok) {
        console.warn('OSM geocoding failed:', response.status);
        return [];
      }

      const data: OSMLocation[] = await response.json();
      
      // Cache the results
      this.osmCache.set(query, data);
      
      return this.convertOSMToPOI(data);
    } catch (error) {
      console.error('Error fetching OSM results:', error);
      return [];
    }
  }

  /**
   * Convert OSM locations to POI format
   */
  private convertOSMToPOI(locations: OSMLocation[]): Array<POI & { source: string; address: string }> {
    return locations.map((location, index) => ({
      id: location.place_id || index,
      name: this.formatOSMName(location),
      coordinates: [parseFloat(location.lon), parseFloat(location.lat)],
      source: 'osm',
      address: location.display_name
    }));
  }

  /**
   * Format OSM location name for display
   */
  private formatOSMName(location: OSMLocation): string {
    // Try to extract a clean name from the display_name
    const parts = location.display_name.split(',');
    let name = parts[0].trim();
    
    // Add category/type if it's different from the name
    if (location.type && !name.toLowerCase().includes(location.type.toLowerCase())) {
      const typeMap: Record<string, string> = {
        'restaurant': '🍽️',
        'cafe': '☕',
        'fast_food': '🍔',
        'pub': '🍺',
        'bar': '🍸',
        'shop': '🏪',
        'supermarket': '🛒',
        'convenience': '🏪',
        'school': '🏫',
        'university': '🎓',
        'hospital': '🏥',
        'clinic': '⚕️',
        'park': '🌳',
        'hotel': '🏨',
        'bank': '🏦',
        'atm': '💳',
        'pharmacy': '💊',
        'gas_station': '⛽',
        'library': '📚',
        'museum': '🏛️',
        'church': '⛪',
        'post_office': '📮',
        'gym': '💪',
        'subway_entrance': '🚇',
        'bus_stop': '🚌'
      };
      
      const icon = typeMap[location.type] || '';
      name = `${icon} ${name}`.trim();
    }
    
    // Add Georgetown context for clearer identification
    if (!name.toLowerCase().includes('georgetown') && location.display_name.toLowerCase().includes('georgetown')) {
      name += ' (Georgetown)';
    }
    
    return name;
  }

  /**
   * Enhanced geocoding that supports both indoor and OSM locations
   */
  public async indoorGeocodeInput(input: string): Promise<POI & { source?: string; address?: string }> {
    // First try indoor POIs
    try {
      const indoorResults = this.miniSearch.search(input);
      if (indoorResults.length > 0) {
        const topResult = indoorResults[0];
        return {
          id: topResult.id,
          name: topResult.name,
          coordinates: topResult.geometry.coordinates,
          source: 'indoor'
        };
      }
    } catch (error) {
      console.log('Indoor geocoding failed, trying OSM...');
    }

    // If no indoor results, try OSM
    const osmResults = await this.getOSMResults(input);
    if (osmResults.length > 0) {
      const osmResult = osmResults[0];
      // Ensure OSM coordinates are properly formatted as [longitude, latitude]
      return {
        ...osmResult,
        coordinates: [parseFloat(osmResult.coordinates[0].toString()), parseFloat(osmResult.coordinates[1].toString())]
      };
    }

    throw new Error("No results found.");
  }

  /**
   * Legacy method for backwards compatibility
   */
  public getAutocompleteResults(query: string, maxResults: number = 3): Array<POI> {
    return this.getIndoorResults(query, maxResults);
  }

  /**
   * Get cutoff index for filtering results
   */
  private getCutoffIndex(results: SearchResult[], topScore: number): number {
    for (let i = 1; i < results.length; i++) {
      const scoreDiff = topScore - results[i].score;
      if (scoreDiff > this.cutoffThreshold) {
        return i;
      }
    }
    return 0;
  }

  /**
   * Clear OSM cache
   */
  public clearOSMCache() {
    this.osmCache.clear();
  }
}
