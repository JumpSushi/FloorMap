/**
 * Convert Concept3D data to OpenIndoorMaps format
 * 
 * Usage:
 * 1. Extract data using concept3d-scraper.js
 * 2. Save the data to a file (e.g., georgetown-concept3d-data.json)
 * 3. Run: node concept3d-converter.js georgetown-concept3d-data.json
 */

const fs = require('fs');
const path = require('path');

class Concept3DConverter {
    constructor() {
        this.buildingId = 1;
        this.poiId = 1;
    }

    // Convert Concept3D data to OpenIndoorMaps format
    convert(concept3dData) {
        console.log('🔄 Converting Concept3D data to OpenIndoorMaps format...');

        const result = {
            id: 1,
            name: "Georgetown University Hilltop Campus",
            description: "Georgetown University's main campus in Washington, D.C.",
            address: "37th and O Streets NW, Washington, DC 20057",
            location: {
                latitude: 38.9076,
                longitude: -77.0723
            },
            indoor_map: {
                type: "FeatureCollection",
                features: []
            },
            pois: {
                type: "FeatureCollection", 
                features: []
            }
        };

        // Process different data sources
        if (concept3dData.buildings) {
            this.processBuildings(concept3dData.buildings, result);
        }

        if (concept3dData.locations) {
            this.processLocations(concept3dData.locations, result);
        }

        if (concept3dData.geojson) {
            this.processGeoJSON(concept3dData.geojson, result);
        }

        // Process intercepted data
        if (concept3dData.interceptedRequests) {
            concept3dData.interceptedRequests.forEach(request => {
                if (request.data) {
                    this.processApiData(request.data, result);
                }
            });
        }

        console.log(`✅ Converted ${result.indoor_map.features.length} buildings and ${result.pois.features.length} POIs`);
        return result;
    }

    // Process building polygons for indoor map
    processBuildings(buildings, result) {
        buildings.forEach(building => {
            if (building.polygon || building.coordinates || building.geometry) {
                const feature = {
                    type: "Feature",
                    properties: {
                        name: building.name || building.title || null,
                        alt_name: building.alt_name || null,
                        category: this.mapCategory(building.category || building.type),
                        restriction: null,
                        accessibility: building.accessibility || null,
                        display_point: null,
                        feature_type: "unit",
                        level_id: building.floor || building.level || null,
                        show: true,
                        area: building.area || 0
                    },
                    geometry: this.convertGeometry(building),
                    id: this.buildingId++
                };

                result.indoor_map.features.push(feature);

                // Also add as POI if it has a name
                if (building.name) {
                    this.addAsPOI(building, result);
                }
            }
        });
    }

    // Process POI locations
    processLocations(locations, result) {
        locations.forEach(location => {
            const poi = {
                type: "Feature",
                geometry: {
                    coordinates: this.extractCoordinates(location),
                    type: "Point"
                },
                properties: {
                    id: this.poiId++,
                    name: location.name || location.title,
                    type: this.mapPOIType(location.category || location.type),
                    floor: location.floor || location.level || 1,
                    metadata: {
                        description: location.description || location.summary || ""
                    },
                    building_id: `GU_${this.sanitizeId(location.name)}`
                }
            };

            result.pois.features.push(poi);
        });
    }

    // Process GeoJSON data
    processGeoJSON(geojson, result) {
        if (geojson.features) {
            geojson.features.forEach(feature => {
                if (feature.geometry.type === 'Polygon' || feature.geometry.type === 'MultiPolygon') {
                    // Add to indoor map
                    const buildingFeature = {
                        type: "Feature",
                        properties: {
                            name: feature.properties.name || null,
                            alt_name: null,
                            category: this.mapCategory(feature.properties.category),
                            restriction: null,
                            accessibility: null,
                            display_point: null,
                            feature_type: "unit",
                            level_id: null,
                            show: true,
                            area: 0
                        },
                        geometry: feature.geometry,
                        id: this.buildingId++
                    };
                    result.indoor_map.features.push(buildingFeature);
                } else if (feature.geometry.type === 'Point') {
                    // Add to POIs
                    const poi = {
                        type: "Feature",
                        geometry: feature.geometry,
                        properties: {
                            id: this.poiId++,
                            name: feature.properties.name,
                            type: this.mapPOIType(feature.properties.category),
                            floor: 1,
                            metadata: {
                                description: feature.properties.description || ""
                            },
                            building_id: `GU_${this.sanitizeId(feature.properties.name)}`
                        }
                    };
                    result.pois.features.push(poi);
                }
            });
        }
    }

    // Process API response data
    processApiData(data, result) {
        if (Array.isArray(data)) {
            data.forEach(item => {
                if (item.coordinates || item.lat) {
                    this.addAsPOI(item, result);
                }
            });
        } else if (data.buildings) {
            this.processBuildings(data.buildings, result);
        } else if (data.locations) {
            this.processLocations(data.locations, result);
        }
    }

    // Convert building to POI
    addAsPOI(building, result) {
        const coordinates = this.extractCoordinates(building);
        if (coordinates) {
            const poi = {
                type: "Feature",
                geometry: {
                    coordinates: coordinates,
                    type: "Point"
                },
                properties: {
                    id: this.poiId++,
                    name: building.name || building.title,
                    type: this.mapPOIType(building.category || building.type),
                    floor: building.floor || building.level || 1,
                    metadata: {
                        description: building.description || building.summary || ""
                    },
                    building_id: `GU_${this.sanitizeId(building.name)}`
                }
            };
            result.pois.features.push(poi);
        }
    }

    // Extract coordinates from various formats
    extractCoordinates(item) {
        if (item.coordinates) {
            return Array.isArray(item.coordinates) ? item.coordinates : [item.coordinates.lng, item.coordinates.lat];
        }
        if (item.lng && item.lat) {
            return [item.lng, item.lat];
        }
        if (item.longitude && item.latitude) {
            return [item.longitude, item.latitude];
        }
        if (item.x && item.y) {
            return [item.x, item.y];
        }
        return null;
    }

    // Convert geometry from various formats
    convertGeometry(item) {
        if (item.geometry) {
            return item.geometry;
        }
        if (item.polygon) {
            return {
                type: "Polygon",
                coordinates: item.polygon
            };
        }
        if (item.coordinates) {
            return {
                type: "Point",
                coordinates: this.extractCoordinates(item)
            };
        }
        return null;
    }

    // Map Concept3D categories to our system
    mapCategory(category) {
        const categoryMap = {
            'academic': 'academic',
            'residence': 'residential', 
            'dining': 'dining',
            'athletics': 'athletic',
            'recreation': 'athletic',
            'parking': 'parking',
            'admin': 'administrative',
            'library': 'library'
        };
        
        if (!category) return null;
        return categoryMap[category.toLowerCase()] || category.toLowerCase();
    }

    // Map POI types to our system
    mapPOIType(type) {
        const typeMap = {
            'academic': 'academic_building',
            'residence': 'residence_hall',
            'dormitory': 'residence_hall',
            'dining': 'dining',
            'restaurant': 'dining',
            'cafeteria': 'dining',
            'athletics': 'athletic_facility',
            'recreation': 'athletic_facility',
            'gym': 'athletic_facility',
            'library': 'library',
            'chapel': 'chapel',
            'church': 'chapel',
            'admin': 'academic_building',
            'office': 'academic_building',
            'parking': 'parking',
            'outdoor': 'outdoor_space',
            'quad': 'outdoor_space'
        };

        if (!type) return 'academic_building';
        return typeMap[type.toLowerCase()] || 'academic_building';
    }

    // Sanitize name for building ID
    sanitizeId(name) {
        if (!name) return 'UNKNOWN';
        return name.toUpperCase()
                  .replace(/[^A-Z0-9]/g, '_')
                  .replace(/_+/g, '_')
                  .replace(/^_|_$/g, '');
    }
}

// CLI usage
if (require.main === module) {
    const inputFile = process.argv[2];
    const outputFile = process.argv[3] || 'georgetown-converted.json';

    if (!inputFile) {
        console.log('Usage: node concept3d-converter.js <input-file> [output-file]');
        console.log('Example: node concept3d-converter.js georgetown-concept3d-data.json building.json');
        process.exit(1);
    }

    if (!fs.existsSync(inputFile)) {
        console.error(`❌ Input file not found: ${inputFile}`);
        process.exit(1);
    }

    try {
        const inputData = JSON.parse(fs.readFileSync(inputFile, 'utf8'));
        const converter = new Concept3DConverter();
        const result = converter.convert(inputData);
        
        fs.writeFileSync(outputFile, JSON.stringify(result, null, 2));
        console.log(`✅ Converted data saved to: ${outputFile}`);
        console.log(`📊 Generated ${result.indoor_map.features.length} building features and ${result.pois.features.length} POIs`);
    } catch (error) {
        console.error('❌ Error converting data:', error.message);
        process.exit(1);
    }
}

module.exports = Concept3DConverter;
