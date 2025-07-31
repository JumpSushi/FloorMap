# Concept3D Map Data Extraction Guide

## Method 1: Browser Developer Tools (Easiest)

1. **Find Georgetown's Map URL**:
   - Try these common patterns:
   - `https://map.concept3d.com/?id=XXXX` (where XXXX is Georgetown's ID)
   - `https://georgetown.concept3d.com/`
   - `https://maps.georgetown.edu/` (might redirect to Concept3D)

2. **Open Browser Dev Tools**:
   - Press F12 or right-click → Inspect
   - Go to **Network** tab
   - Refresh the page
   - Look for requests containing:
     - `.json` files (building data)
     - `api/` endpoints
     - `buildings`, `locations`, `campus` in URL

3. **Run the Scraper Script**:
   - Copy the content from `concept3d-scraper.js`
   - Paste in Console tab
   - It will automatically extract and download data

## Method 2: API Endpoints (Most Reliable)

Common Concept3D API patterns:
```
https://map.concept3d.com/api/map/{id}/buildings
https://map.concept3d.com/api/map/{id}/locations  
https://map.concept3d.com/api/map/{id}/categories
https://map.concept3d.com/api/map/{id}/geojson
```

## Method 3: Direct Data Extraction

### Finding the Map ID:
1. View page source
2. Search for:
   - `mapId`
   - `concept3d`
   - `map.concept3d.com`
   - Numbers that might be IDs

### Common Data Locations:
- `window.mapData`
- `window.buildingData`
- `window.campusConfig`
- Embedded JSON in `<script>` tags

## Method 4: Using Python/Node.js

```python
import requests
import json

# Try to find Georgetown's map ID
def find_concept3d_data(map_id):
    endpoints = [
        f"https://map.concept3d.com/api/map/{map_id}/buildings",
        f"https://map.concept3d.com/api/map/{map_id}/locations",
        f"https://map.concept3d.com/api/map/{map_id}/geojson"
    ]
    
    for endpoint in endpoints:
        try:
            response = requests.get(endpoint)
            if response.status_code == 200:
                return response.json()
        except:
            continue
    return None
```

## What to Look For:

### Building Data Structure:
```json
{
  "buildings": [
    {
      "id": "123",
      "name": "Darnall Hall",
      "category": "residence",
      "coordinates": [-77.0732, 38.9084],
      "polygon": [...],
      "description": "...",
      "amenities": [...]
    }
  ]
}
```

### GeoJSON Format:
```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": {
        "name": "Building Name",
        "category": "academic"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [...]
      }
    }
  ]
}
```

## Converting to OpenIndoorMaps Format:

Once you extract the data, you'll need to convert it to our format:

1. **Building polygons** → `indoor_map.features[]`
2. **POI points** → `pois.features[]`
3. **Categories** → POI types in our system
4. **Coordinates** → Ensure they're in WGS84 format

## Legal Considerations:

- ✅ **OK**: Extracting publicly visible data for educational/personal use
- ✅ **OK**: Using data to create your own campus navigation
- ⚠️ **Check**: University's terms of service
- ❌ **Avoid**: Republishing their exact map commercially

## Next Steps:

1. Find Georgetown's Concept3D map URL
2. Run the scraper script
3. Extract building and POI data
4. Convert to OpenIndoorMaps format
5. Replace mock data in building.json
