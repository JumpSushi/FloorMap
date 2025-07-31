#!/usr/bin/env python3
"""
Georgetown University Concept3D Map Scraper
Simple Python script to extract map data from Concept3D
"""

import requests
import json
import re
from urllib.parse import urljoin, urlparse
import sys

class GeorgetownMapScraper:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        })
        
    def find_georgetown_map(self):
        """Try to find Georgetown's Concept3D map URL"""
        
        # Common patterns for university Concept3D maps
        possible_urls = [
            "https://map.concept3d.com/?id=1161",  # Common Georgetown ID
            "https://georgetown.concept3d.com/",
            "https://maps.georgetown.edu/",
            "https://www.georgetown.edu/campus-map/"
        ]
        
        for url in possible_urls:
            print(f"🔍 Trying: {url}")
            try:
                response = self.session.get(url, timeout=10)
                if response.status_code == 200:
                    if 'concept3d' in response.text.lower() or 'campus map' in response.text.lower():
                        print(f"✅ Found map at: {url}")
                        return url, response.text
            except Exception as e:
                print(f"❌ Failed: {e}")
                
        return None, None
    
    def extract_map_id(self, html_content):
        """Extract map ID from HTML"""
        
        # Look for map ID in various formats
        patterns = [
            r'mapId["\']?\s*[:=]\s*["\']?(\d+)',
            r'concept3d\.com/\?id=(\d+)',
            r'map\.concept3d\.com.*?id=(\d+)',
            r'id["\']?\s*[:=]\s*["\']?(\d+)'
        ]
        
        for pattern in patterns:
            matches = re.findall(pattern, html_content, re.IGNORECASE)
            if matches:
                print(f"🆔 Found map ID: {matches[0]}")
                return matches[0]
                
        return None
    
    def get_api_data(self, map_id):
        """Fetch data from Concept3D API endpoints"""
        
        base_url = f"https://map.concept3d.com/api/map/{map_id}"
        endpoints = [
            "/buildings",
            "/locations", 
            "/categories",
            "/geojson",
            "/data.json"
        ]
        
        data = {}
        
        for endpoint in endpoints:
            url = base_url + endpoint
            print(f"📡 Fetching: {url}")
            
            try:
                response = self.session.get(url, timeout=10)
                if response.status_code == 200:
                    json_data = response.json()
                    data[endpoint.strip('/')] = json_data
                    print(f"✅ Got {len(json_data) if isinstance(json_data, list) else 'data'} from {endpoint}")
                else:
                    print(f"❌ {response.status_code} for {endpoint}")
            except Exception as e:
                print(f"❌ Error fetching {endpoint}: {e}")
                
        return data
    
    def convert_to_openindoormaps(self, concept3d_data):
        """Convert Concept3D data to OpenIndoorMaps format"""
        
        result = {
            "id": 1,
            "name": "Georgetown University Hilltop Campus",
            "description": "Georgetown University's main campus in Washington, D.C.",
            "address": "37th and O Streets NW, Washington, DC 20057",
            "location": {
                "latitude": 38.9076,
                "longitude": -77.0723
            },
            "indoor_map": {
                "type": "FeatureCollection",
                "features": []
            },
            "pois": {
                "type": "FeatureCollection", 
                "features": []
            }
        }
        
        building_id = 1
        poi_id = 1
        
        # Process buildings
        if 'buildings' in concept3d_data:
            for building in concept3d_data['buildings']:
                if isinstance(building, dict) and building.get('name'):
                    
                    # Add as POI
                    poi = {
                        "type": "Feature",
                        "geometry": {
                            "coordinates": self.extract_coordinates(building),
                            "type": "Point"
                        },
                        "properties": {
                            "id": poi_id,
                            "name": building.get('name'),
                            "type": self.map_poi_type(building.get('category', 'academic')),
                            "floor": building.get('floor', 1),
                            "metadata": {
                                "description": building.get('description', '')
                            },
                            "building_id": f"GU_{self.sanitize_id(building.get('name', ''))}"
                        }
                    }
                    
                    if poi['geometry']['coordinates']:
                        result['pois']['features'].append(poi)
                        poi_id += 1
        
        # Process locations
        if 'locations' in concept3d_data:
            for location in concept3d_data['locations']:
                if isinstance(location, dict) and location.get('name'):
                    poi = {
                        "type": "Feature", 
                        "geometry": {
                            "coordinates": self.extract_coordinates(location),
                            "type": "Point"
                        },
                        "properties": {
                            "id": poi_id,
                            "name": location.get('name'),
                            "type": self.map_poi_type(location.get('category', 'academic')),
                            "floor": 1,
                            "metadata": {
                                "description": location.get('description', '')
                            },
                            "building_id": f"GU_{self.sanitize_id(location.get('name', ''))}"
                        }
                    }
                    
                    if poi['geometry']['coordinates']:
                        result['pois']['features'].append(poi)
                        poi_id += 1
        
        print(f"📊 Converted {len(result['pois']['features'])} POIs")
        return result
    
    def extract_coordinates(self, item):
        """Extract coordinates from various formats"""
        
        if 'coordinates' in item:
            coords = item['coordinates']
            if isinstance(coords, list) and len(coords) >= 2:
                return coords[:2]
        
        if 'lng' in item and 'lat' in item:
            return [item['lng'], item['lat']]
            
        if 'longitude' in item and 'latitude' in item:
            return [item['longitude'], item['latitude']]
            
        if 'x' in item and 'y' in item:
            return [item['x'], item['y']]
            
        return None
    
    def map_poi_type(self, category):
        """Map Concept3D categories to OpenIndoorMaps POI types"""
        
        type_map = {
            'academic': 'academic_building',
            'residence': 'residence_hall',
            'dining': 'dining',
            'athletics': 'athletic_facility',
            'library': 'library',
            'chapel': 'chapel',
            'admin': 'academic_building'
        }
        
        return type_map.get(category.lower() if category else '', 'academic_building')
    
    def sanitize_id(self, name):
        """Create a clean building ID from name"""
        
        if not name:
            return 'UNKNOWN'
        
        return re.sub(r'[^A-Z0-9]', '_', name.upper()).strip('_')
    
    def scrape(self, output_file='georgetown-map-data.json'):
        """Main scraping function"""
        
        print("🏫 Georgetown University Map Scraper Starting...")
        
        # Find the map
        map_url, html_content = self.find_georgetown_map()
        if not map_url:
            print("❌ Could not find Georgetown's Concept3D map")
            return False
            
        # Extract map ID
        map_id = self.extract_map_id(html_content)
        if not map_id:
            print("❌ Could not extract map ID")
            return False
            
        # Get API data
        concept3d_data = self.get_api_data(map_id)
        if not concept3d_data:
            print("❌ Could not fetch any data from API")
            return False
            
        # Convert to OpenIndoorMaps format
        result = self.convert_to_openindoormaps(concept3d_data)
        
        # Save to file
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(result, f, indent=2, ensure_ascii=False)
            
        print(f"✅ Data saved to: {output_file}")
        return True

if __name__ == "__main__":
    scraper = GeorgetownMapScraper()
    
    output_file = sys.argv[1] if len(sys.argv) > 1 else 'georgetown-map-data.json'
    success = scraper.scrape(output_file)
    
    if success:
        print("\n🎉 Scraping completed successfully!")
        print(f"📁 Data saved to: {output_file}")
        print("\nNext steps:")
        print("1. Review the extracted data")
        print("2. Replace app/mock/building.json with your data")
        print("3. Restart the development server")
    else:
        print("\n💥 Scraping failed. Try manual extraction using the browser script.")
        sys.exit(1)
