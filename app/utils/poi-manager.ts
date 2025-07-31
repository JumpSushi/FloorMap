import fs from 'fs';
import path from 'path';
import { POIFeature } from '~/types/poi';

// Load POI data
let allPOIs: POIFeature[] = [];

try {
  const poisData = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'app/mock/all-pois.json'), 'utf8'));
  allPOIs = poisData.features;
} catch (error) {
  console.warn('Could not load POI data:', error);
}

export const getSearchablePOIs = (): POIFeature[] => {
  return allPOIs;
};

export const getReissPOIs = (): POIFeature[] => {
  return allPOIs.filter(poi => 
    poi.properties.building_id === 'reiss_science_building'
  );
};

export const searchPOIsByName = (query: string): POIFeature[] => {
  const lowerQuery = query.toLowerCase();
  return allPOIs.filter(poi => 
    poi.properties.name.toLowerCase().includes(lowerQuery) ||
    poi.properties.metadata.building?.toLowerCase().includes(lowerQuery) ||
    poi.properties.metadata.description?.toLowerCase().includes(lowerQuery)
  );
};

export const getPOIsByCategory = (category: string): POIFeature[] => {
  return allPOIs.filter(poi => 
    poi.properties.metadata.category === category
  );
};

export const getPOIsByBuilding = (building: string): POIFeature[] => {
  const buildingId = building.toLowerCase().replace(/s+/g, '_');
  return allPOIs.filter(poi => 
    poi.properties.building_id === buildingId
  );
};
