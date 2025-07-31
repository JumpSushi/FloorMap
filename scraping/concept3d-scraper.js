/**
 * Concept3D Map Data Scraper
 * 
 * Instructions:
 * 1. Open Georgetown's Concept3D map in your browser
 * 2. Open Developer Tools (F12)
 * 3. Go to Console tab
 * 4. Paste this script and run it
 */

// Function to extract map data from Concept3D
function extractConcept3DData() {
    console.log('🔍 Starting Concept3D data extraction...');
    
    // Method 1: Look for global map data variables
    const possibleDataVars = [
        'mapData',
        'buildingData', 
        'campusData',
        'c3dData',
        'concept3dData',
        'mapConfig',
        'buildingConfig'
    ];
    
    const foundData = {};
    
    possibleDataVars.forEach(varName => {
        if (window[varName]) {
            console.log(`✅ Found data in window.${varName}`);
            foundData[varName] = window[varName];
        }
    });
    
    // Method 1.5: Extract from CSS-positioned markers (Concept3D specific)
    function extractCSSMarkers() {
        console.log('🎯 Extracting CSS-positioned markers...');
        const markers = [];
        
        // Look for elements with CSS transforms (common in Concept3D)
        const allElements = document.querySelectorAll('*');
        
        allElements.forEach(el => {
            const style = window.getComputedStyle(el);
            const transform = style.transform;
            const backgroundImage = style.backgroundImage;
            
            // Check if element has CSS transform positioning
            if (transform && transform.includes('translate') && transform !== 'none') {
                const marker = {
                    element: el,
                    transform: transform,
                    backgroundImage: backgroundImage,
                    className: el.className,
                    id: el.id,
                    textContent: el.textContent?.trim(),
                    title: el.title || el.getAttribute('title'),
                    dataAttributes: {}
                };
                
                // Extract data attributes
                for (let attr of el.attributes) {
                    if (attr.name.startsWith('data-')) {
                        marker.dataAttributes[attr.name] = attr.value;
                    }
                }
                
                // Parse coordinates from transform
                const coords = parseTransformCoordinates(transform);
                if (coords) {
                    marker.cssCoordinates = coords;
                }
                
                // Determine marker type from background image or class
                marker.type = determineMarkerType(backgroundImage, el.className);
                
                if (marker.textContent || marker.title || marker.backgroundImage.includes('.png')) {
                    markers.push(marker);
                    console.log(`📍 Found marker: ${marker.textContent || marker.title || 'Unnamed'}`, coords);
                }
            }
        });
        
        return markers;
    }
    
    // Helper function to parse coordinates from CSS transform
    function parseTransformCoordinates(transform) {
        // Match translate(-91px, 736px) pattern
        const translateMatch = transform.match(/translate\(([^,]+),\s*([^)]+)\)/);
        if (translateMatch) {
            const x = parseFloat(translateMatch[1].replace('px', ''));
            const y = parseFloat(translateMatch[2].replace('px', ''));
            return { x, y, cssX: x, cssY: y };
        }
        return null;
    }
    
    // Helper function to determine marker type
    function determineMarkerType(backgroundImage, className) {
        const imageUrl = backgroundImage.toLowerCase();
        const classStr = className.toLowerCase();
        
        if (imageUrl.includes('athletics') || classStr.includes('athletics')) return 'athletic_facility';
        if (imageUrl.includes('dining') || classStr.includes('dining')) return 'dining';
        if (imageUrl.includes('residence') || classStr.includes('residence')) return 'residence_hall';
        if (imageUrl.includes('library') || classStr.includes('library')) return 'library';
        if (imageUrl.includes('academic') || classStr.includes('academic')) return 'academic_building';
        if (imageUrl.includes('admin') || classStr.includes('admin')) return 'academic_building';
        if (imageUrl.includes('parking') || classStr.includes('parking')) return 'parking';
        
        return 'academic_building'; // default
    }
    
    // Method 2: Intercept XHR/Fetch requests
    const originalFetch = window.fetch;
    const originalXHR = XMLHttpRequest.prototype.open;
    
    // Store intercepted data
    window.interceptedData = window.interceptedData || [];
    
    // Override fetch
    window.fetch = function(...args) {
        console.log('🌐 Fetch request:', args[0]);
        return originalFetch.apply(this, args).then(response => {
            if (response.url.includes('.json') || 
                response.url.includes('api') || 
                response.url.includes('data')) {
                response.clone().json().then(data => {
                    window.interceptedData.push({
                        url: response.url,
                        data: data
                    });
                    console.log('📦 Intercepted data from:', response.url);
                }).catch(() => {});
            }
            return response;
        });
    };
    
    // Method 3: Look for building markers/polygons on the map
    function extractMapElements() {
        const buildings = [];
        const pois = [];
        
        // Look for building elements
        const buildingElements = document.querySelectorAll([
            '[data-building]',
            '[class*="building"]',
            '[class*="marker"]',
            '.building',
            '.poi',
            '.location'
        ].join(','));
        
        buildingElements.forEach(el => {
            const building = {
                name: el.textContent?.trim() || el.getAttribute('title') || el.getAttribute('data-name'),
                id: el.getAttribute('data-id') || el.getAttribute('id'),
                category: el.getAttribute('data-category') || el.className,
                element: el
            };
            
            if (building.name) {
                buildings.push(building);
            }
        });
        
        return { buildings, pois };
    }
    
    // Method 4: Extract from map configuration
    function extractMapConfig() {
        const scripts = document.querySelectorAll('script');
        const configData = [];
        
        scripts.forEach(script => {
            if (script.textContent) {
                // Look for JSON-like data
                const jsonMatches = script.textContent.match(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g);
                if (jsonMatches) {
                    jsonMatches.forEach(match => {
                        try {
                            const parsed = JSON.parse(match);
                            if (parsed.buildings || parsed.locations || parsed.coordinates) {
                                configData.push(parsed);
                            }
                        } catch (e) {}
                    });
                }
            }
        });
        
        return configData;
    }
    
    // Run all extraction methods
    const results = {
        globalData: foundData,
        cssMarkers: extractCSSMarkers(), // New method for CSS-positioned markers
        mapElements: extractMapElements(),
        configData: extractMapConfig(),
        interceptedRequests: window.interceptedData || []
    };
    
    console.log('📊 Extraction Results:', results);
    console.log(`🎯 Found ${results.cssMarkers.length} CSS markers`);
    
    // Download as JSON file
    const dataStr = JSON.stringify(results, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'georgetown-concept3d-data.json';
    link.click();
    
    console.log('💾 Data saved to georgetown-concept3d-data.json');
    return results;
}

// Run the extraction
// extractConcept3DData(); // Comment out auto-run

// Additional helper functions
window.getConcept3DBuildings = function() {
    // Try to find building data in common Concept3D patterns
    const buildings = [];
    
    // Check for Leaflet layers (common in Concept3D)
    if (window.L && window.L.geoJSON) {
        console.log('🗺️ Found Leaflet, checking for GeoJSON layers...');
    }
    
    // Check for building data in window object
    Object.keys(window).forEach(key => {
        if (key.toLowerCase().includes('building') || 
            key.toLowerCase().includes('location') ||
            key.toLowerCase().includes('poi')) {
            console.log(`🏢 Found potential building data: window.${key}`);
            buildings.push({key, data: window[key]});
        }
    });
    
    return buildings;
};

// Quick test function for CSS markers
window.testCSSMarkers = function() {
    console.log('🧪 Testing CSS marker extraction...');
    
    const allElements = document.querySelectorAll('*');
    let count = 0;
    
    allElements.forEach(el => {
        const style = window.getComputedStyle(el);
        const transform = style.transform;
        const backgroundImage = style.backgroundImage;
        
        if (transform && transform.includes('translate') && transform !== 'none') {
            count++;
            console.log(`${count}. Element:`, {
                tag: el.tagName,
                class: el.className,
                transform: transform,
                backgroundImage: backgroundImage,
                text: el.textContent?.trim()?.substring(0, 50)
            });
        }
    });
    
    console.log(`🎯 Found ${count} elements with CSS transforms`);
    return count;
};

// Monitor for dynamic content loading
const observer = new MutationObserver(() => {
    console.log('🔄 DOM changed, re-checking for data...');
    setTimeout(extractConcept3DData, 2000);
});

observer.observe(document.body, { childList: true, subtree: true });

console.log('🚀 Concept3D scraper loaded!');
console.log('📋 Available commands:');
console.log('  testCSSMarkers() - Test CSS marker detection');
console.log('  getConcept3DBuildings() - Check for building data');
console.log('  extractConcept3DData() - Run full extraction');
console.log('  findMarkersByBackground() - Look for background images');

// New helper to find elements with background images
window.findMarkersByBackground = function() {
    console.log('🖼️ Looking for elements with background images...');
    
    const elements = document.querySelectorAll('*');
    let found = [];
    
    elements.forEach(el => {
        const style = window.getComputedStyle(el);
        const bg = style.backgroundImage;
        
        if (bg && bg !== 'none' && bg.includes('url')) {
            found.push({
                element: el,
                backgroundImage: bg,
                transform: style.transform,
                className: el.className,
                textContent: el.textContent?.trim()?.substring(0, 50)
            });
        }
    });
    
    console.log(`🎯 Found ${found.length} elements with background images`);
    found.forEach((item, i) => {
        console.log(`${i+1}.`, item);
    });
    
    return found;
};
