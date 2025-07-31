export interface POI {
  id: string | number;
  name: string;
  coordinates: [number, number];
  type: string;
  floor?: number;
  building?: string;
  category?: string;
  amenities?: string[];
  description?: string;
}

export interface POIProperties {
  id: string | number;
  name: string;
  type: string;
  floor: number;
  metadata: Record<string, any>;
  building_id: string;
}

export interface POIFeature extends GeoJSON.Feature<GeoJSON.Point> {
  properties: POIProperties;
}

// Reiss Science Building POI types
export type ReissRoomType = 'class' | 'lab' | 'office' | 'bathroom' | 'corridor' | 'elevator';

export interface ReissPOI extends POI {
  building: 'Reiss Science Building';
  level: 0;
  room_number?: string;
  room_type?: ReissRoomType;
}
