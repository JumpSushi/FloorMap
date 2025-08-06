# Concept3D Official Wayfinding API Integration

This integration provides access to the official Concept3D wayfinding API for outdoor directions, with fallback to OpenStreetMap routing when needed.

## Overview

The Concept3D wayfinding API provides high-quality outdoor routing with detailed turn-by-turn directions. This integration:

- Uses the official Concept3D API as the primary routing service
- Falls back to OSRM/OpenStreetMap routing if Concept3D is unavailable
- Provides consistent interfaces that work with existing indoor/outdoor navigation systems
- Supports walking, driving, and cycling modes

## API Example

The service integrates with the official Concept3D wayfinding API:

```
https://api.concept3d.com/wayfinding/v2?map=999&stamp=NOU5Cneg&fromLevel=0&toLevel=0&currentLevel=0&toLat=38.909557&toLng=-77.073502&fromLat=38.907677&fromLng=-77.068962&mode=walking&getThirdParty=true&mapType=mapboxgl&key=0001085cc708b9cef47080f064612ca5
```

## Configuration

Configure the service in `app/config.ts`:

```typescript
const config = {
  concept3d: {
    wayfindingApi: "https://api.concept3d.com/wayfinding/v2",
    mapId: "999", // Your Concept3D map ID
    apiKey: "your-api-key", // Your Concept3D API key
    defaultStamp: "default-stamp" // Default request identifier
  }
  // ... other config
};
```

## Basic Usage

### Using the Direct Service

```typescript
import Concept3DWayfindingService from '~/services/concept3d-wayfinding';

const service = new Concept3DWayfindingService({
  map: "999",
  key: "your-api-key"
});

// Get directions
const route = await service.getDirections(
  [-77.068962, 38.907677], // from [lng, lat]
  [-77.073502, 38.909557], // to [lng, lat]
  { mode: 'walking' }
);

console.log('Route:', route.distance, 'meters', route.formattedDuration);
```

### Using the React Hook

```typescript
import { useConcept3DWayfinding } from '~/hooks/use-concept3d-wayfinding';

function MyComponent() {
  const { getDirections, getInstructions } = useConcept3DWayfinding();
  
  const handleGetRoute = async () => {
    const route = await getDirections(
      [-77.068962, 38.907677],
      [-77.073502, 38.909557]
    );
    
    const instructions = getInstructions(route);
    console.log('Turn-by-turn:', instructions);
  };
  
  return <button onClick={handleGetRoute}>Get Directions</button>;
}
```

### Using with Enhanced Directions (Automatic Integration)

The enhanced directions system automatically uses Concept3D for outdoor routing:

```typescript
import useEnhancedDirections from '~/hooks/use-enhanced-directions';

function MapComponent() {
  const { navigateToLocation } = useEnhancedDirections(map, indoorDirections);
  
  const handleNavigate = async () => {
    // This will automatically use Concept3D for outdoor portions
    const route = await navigateToLocation(
      [-77.068962, 38.907677], // start
      [-77.073502, 38.909557]  // end
    );
  };
  
  return <button onClick={handleNavigate}>Navigate</button>;
}
```

## API Response Format

The Concept3D API returns detailed route information:

```typescript
interface Concept3DRoute {
  distance: number; // Total distance in meters
  duration: number; // Total duration in seconds
  formattedDuration: string; // Human readable (e.g., "7 mins")
  bbox: [number, number][]; // Bounding box coordinates
  route: Concept3DRouteSegment[]; // Turn-by-turn segments
  pivotPoints: [number, number][]; // Key turning points
  fullPath: [number, number][]; // Complete route coordinates
  provider: string; // Routing provider (e.g., "mapbox")
  directionsType: string; // Type of directions (e.g., "walking")
}
```

### Route Segments

Each route segment includes:

```typescript
interface Concept3DRouteSegment {
  distance: number;
  formattedDistance: string; // e.g., "0.15 miles"
  duration: number;
  formattedDuration: string; // e.g., "4 mins"
  modifier: string; // e.g., "start", "left", "right", "straight"
  type: string; // e.g., "start", "turn", "arrive"
  action: string; // Human readable instruction
  route: [number, number][]; // Coordinates for this segment
  level: number; // Floor/level number
  directionsType: string;
}
```

## Available Methods

### Concept3DWayfindingService

- `getDirections(from, to, options)` - Get route between two points
- `routeToGeoJSON(route)` - Convert route to GeoJSON LineString
- `routeToOSMFormat(route)` - Convert to OSM-compatible format
- `getInstructions(route)` - Extract turn-by-turn instructions
- `generateStamp()` - Generate unique request identifier

### useConcept3DWayfinding Hook

- `getDirections(from, to, options)` - Get directions with error handling
- `routeToGeoJSON(route)` - Convert route to GeoJSON
- `getInstructions(route)` - Get turn-by-turn instructions
- `getRouteDetails(route)` - Get detailed route information
- `routeToOSMFormat(route)` - Convert for existing systems

## Options

### Wayfinding Options

```typescript
interface Concept3DWayfindingOptions {
  map?: string; // Map ID
  stamp?: string; // Request identifier
  fromLevel?: number; // Starting level/floor
  toLevel?: number; // Destination level/floor
  currentLevel?: number; // Current level/floor
  mode?: 'walking' | 'driving' | 'cycling'; // Travel mode
  getThirdParty?: boolean; // Include third-party routing
  mapType?: 'mapboxgl' | 'leaflet'; // Map system type
  key?: string; // API key
}
```

## Integration Features

### Automatic Fallback

The system automatically falls back to OSRM if Concept3D is unavailable:

```typescript
// In CrossBuildingNavigationService
try {
  // Try Concept3D first
  const concept3dRoute = await this.concept3dService.getDirections(start, end);
  return this.concept3dService.routeToOSMFormat(concept3dRoute);
} catch (error) {
  // Fall back to OSRM
  return this.getOSRMRoute(start, end, options);
}
```

### Cross-Building Navigation

The service integrates seamlessly with indoor routing:

- Indoor routes use the existing pathfinding system
- Outdoor routes use Concept3D (primary) or OSRM (fallback)
- Transition routes connect indoor and outdoor segments
- All route types are displayed consistently on the map

## Testing

Use the test utilities to validate the integration:

```typescript
import { runAllTests } from '~/utils/test-concept3d-wayfinding';

// Run comprehensive tests
const results = await runAllTests();
console.log('Tests passed:', results.concept3dService.success && results.integration.success);
```

## Demo Component

A demo component is available to test the integration:

```typescript
import { Concept3DWayfindingDemo } from '~/components/concept3d-wayfinding-demo';

function App() {
  return (
    <Concept3DWayfindingDemo 
      onRouteGenerated={(route) => console.log('Route:', route)}
    />
  );
}
```

## Reusable Navigation Components

The integration includes reusable components for displaying navigation instructions and route segments with collapsible functionality to prevent page overflow:

### NavigationInstructions Component

```typescript
import { NavigationInstructions } from '~/components/navigation-instructions';

function MyComponent() {
  const instructions = [
    "Walk west on the walkway. Then turn left onto the crosswalk. (34 m, 1 min)",
    "Turn left onto West Road. (6 m, 0 min)",
    "Turn left. (19 m, 1 min)",
    // ... more instructions
  ];

  return (
    <NavigationInstructions 
      instructions={instructions}
      title="Turn-by-Turn Directions"
      maxInitialItems={2}
      showStepNumbers={true}
    />
  );
}
```

### RouteSegments Component

```typescript
import { RouteSegments } from '~/components/route-segments';

function MyComponent() {
  const segments = [
    {
      action: "Walk west on the walkway",
      formattedDistance: "34 m",
      formattedDuration: "1 min",
      modifier: "start",
      coordinateCount: 15
    },
    // ... more segments
  ];

  return (
    <RouteSegments 
      segments={segments}
      title="Route Details"
      maxInitialItems={2}
      showCoordinateCount={true}
    />
  );
}
```

### Component Features

- **Collapsible**: Shows only first 2 items initially with "Show More" button
- **Scrollable**: Max height with scroll when expanded to prevent page overflow
- **Responsive**: Clean, mobile-friendly design
- **Customizable**: Configurable titles, initial item count, and styling
- **Accessible**: Proper ARIA labels and keyboard navigation

## Error Handling

The service includes comprehensive error handling:

```typescript
try {
  const route = await getDirections(from, to);
  // Handle successful route
} catch (error) {
  if (error.message.includes('API error')) {
    // Handle API errors
  } else if (error.message.includes('No routes found')) {
    // Handle no route scenarios
  } else {
    // Handle other errors
  }
}
```

## Performance Considerations

- The service generates unique stamps for each request to avoid caching issues
- Routes are converted to standardized formats for consistency
- Fallback routing ensures reliability
- GeoJSON conversion is optimized for map display

## Security Notes

- API keys should be properly configured and secured
- Request stamps can be used for tracking and debugging
- The service validates all coordinate inputs
- Error messages don't expose sensitive information

## Example Response

Here's an example of what the Concept3D API returns:

```json
{
  "routes": [{
    "distance": 544.202,
    "duration": 412.764,
    "formattedDuration": "7 mins",
    "bbox": [[38.907676,-77.068934], [38.909637,-77.073292], ...],
    "route": [{
      "distance": 238.074,
      "formattedDistance": "0.15 miles",
      "duration": 190.345,
      "formattedDuration": "4 mins",
      "modifier": "start",
      "type": "start",
      "action": "Walk west on the walkway. Then turn right onto the walkway.",
      "route": [[38.907676,-77.068934], [38.907671,-77.069032], ...],
      "level": 0,
      "directionsType": "walking"
    }],
    "fullPath": [[38.907676,-77.068934], [38.907671,-77.069032], ...],
    "provider": "mapbox",
    "directionsType": "walking"
  }],
  "status": "ok",
  "stamp": "NOU5Cneg"
}
```

This integration provides a robust, production-ready wayfinding solution that leverages the official Concept3D API while maintaining compatibility with existing systems.
