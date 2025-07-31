import {
  Accessibility,
  ArrowLeft,
  ArrowUpDown,
  Dot,
  MapPin,
  Navigation,
  Route,
  Building,
  Globe,
} from "lucide-react";
import { useEffect, useState } from "react";
import { POI } from "~/types/poi";
import { EnhancedIndoorGeocoder } from "~/utils/enhanced-indoor-geocoder";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Toggle } from "../ui/toggle";
import EnhancedSuggestionsList from "./enhanced-suggestions-list";
import useEnhancedDirections from "~/hooks/use-enhanced-directions";
import useMapStore from "~/stores/use-map-store";
import { CrossBuildingRoute, RouteInstruction } from "~/services/cross-building-navigation";

interface EnhancedNavigationViewProps {
  handleBackClick: () => void;
  selectedPOI: POI | null;
  indoorGeocoder: EnhancedIndoorGeocoder;
}

export default function EnhancedNavigationView({
  handleBackClick,
  selectedPOI,
  indoorGeocoder,
}: EnhancedNavigationViewProps) {
  const [activeInput, setActiveInput] = useState<
    "departure" | "destination" | null
  >(null);
  const [departureLocation, setDepartureLocation] = useState("");
  const [destinationLocation, setDestinationLocation] = useState(
    selectedPOI?.name || "",
  );
  const [suggestions, setSuggestions] = useState<Array<POI & { source?: string; address?: string }>>([]);
  const [isAccessibleRoute, setIsAccessibleRoute] = useState(false);
  const [currentRoute, setCurrentRoute] = useState<CrossBuildingRoute | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const [routeInstructions, setRouteInstructions] = useState<RouteInstruction[]>([]);
  const [useCurrentLocation, setUseCurrentLocation] = useState(false);
  const [includeOSM, setIncludeOSM] = useState(true);
  
  const map = useMapStore((state) => state.mapInstance);
  const {
    navigateToLocation,
    navigateFromCurrentLocation,
    clearRouteFromMap,
  } = useEnhancedDirections(map);

  const activeQuery =
    activeInput === "departure" ? departureLocation : destinationLocation;

  useEffect(() => {
    // Clear suggestions immediately if query is too short or no active input
    if (!activeInput || !activeQuery || activeQuery.trim().length <= 2) {
      setSuggestions([]);
      return;
    }

    // Debounce the API request - wait 1 second after user stops typing
    const timeoutId = setTimeout(async () => {
      try {
        console.log('Fetching suggestions for:', activeQuery, 'includeOSM:', includeOSM);
        const newSuggestions = await indoorGeocoder.getEnhancedAutocompleteResults(activeQuery, 3, includeOSM);
        console.log('Got suggestions:', newSuggestions);
        setSuggestions(newSuggestions);
      } catch (error) {
        console.error('Error fetching suggestions:', error);
        setSuggestions([]);
      }
    }, 1000); // 1 second delay

    // Cleanup function to cancel the timeout if effect runs again
    return () => clearTimeout(timeoutId);
  }, [activeInput, activeQuery, indoorGeocoder, includeOSM]);

  const handleSuggestionClick = (suggestion: POI) => {
    const newDeparture =
      activeInput === "departure" ? suggestion.name : departureLocation;
    const newDestination =
      activeInput === "destination" ? suggestion.name : destinationLocation;

    if (activeInput === "departure") {
      setDepartureLocation(suggestion.name);
    } else if (activeInput === "destination") {
      setDestinationLocation(suggestion.name);
    }
    setSuggestions([]);
    setActiveInput(null);

    if (newDeparture || useCurrentLocation) {
      handleCrossBuildingRouting(newDeparture, newDestination);
    }
  };

  const handleSwapLocations = () => {
    const temp = departureLocation;
    setDepartureLocation(destinationLocation);
    setDestinationLocation(temp);
    
    if ((departureLocation || useCurrentLocation) && destinationLocation) {
      handleCrossBuildingRouting(destinationLocation, temp);
    }
  };

  const handleCurrentLocationToggle = (enabled: boolean) => {
    console.log('Current location toggle:', enabled);
    setUseCurrentLocation(enabled);
    if (enabled) {
      setDepartureLocation("Current Location");
      if (destinationLocation) {
        handleNavigateFromCurrentLocation();
      }
    } else {
      setDepartureLocation("");
    }
  };

  const handleNavigateFromCurrentLocation = async () => {
    if (!destinationLocation) return;
    
    setIsNavigating(true);
    try {
      const destinationGeo = await indoorGeocoder.indoorGeocodeInput(destinationLocation);
      if (!destinationGeo?.coordinates) {
        throw new Error("Invalid destination");
      }

      // Use coordinates as destination (building context will be determined by the service)
      const destination = destinationGeo.coordinates as [number, number];

      const route = await navigateFromCurrentLocation(destination, {
        profile: 'walking',
        overview: 'full',
        accessibleRoute: isAccessibleRoute
      });

      if (route) {
        setCurrentRoute(route);
        setRouteInstructions(route.instructions);
      }
    } catch (error) {
      console.error('Navigation from current location failed:', error);
      alert('Could not get your current location or find a route.');
    } finally {
      setIsNavigating(false);
    }
  };

  const handleCrossBuildingRouting = async (departureValue: string, destinationValue: string) => {
    console.log('handleCrossBuildingRouting called:', { departureValue, destinationValue, useCurrentLocation });
    if ((!departureValue && !useCurrentLocation) || !destinationValue) {
      console.log('Missing departure or destination');
      return;
    }

    if (useCurrentLocation) {
      await handleNavigateFromCurrentLocation();
      return;
    }

    setIsNavigating(true);
    try {
      let departureGeo, destinationGeo;
      
      try {
        departureGeo = await indoorGeocoder.indoorGeocodeInput(departureValue);
        console.log('Departure geocoded:', departureGeo);
      } catch (error) {
        console.error(`Geocoding failed for departure "${departureValue}":`, error);
        // Try to get suggestions to see what's available
        const suggestions = await indoorGeocoder.getEnhancedAutocompleteResults(departureValue, 3, includeOSM);
        console.log('Available suggestions for departure:', suggestions);
        throw new Error(`Could not find location "${departureValue}". Check spelling or try a different name.`);
      }
      
      try {
        destinationGeo = await indoorGeocoder.indoorGeocodeInput(destinationValue);
        console.log('Destination geocoded:', destinationGeo);
      } catch (error) {
        console.error(`Geocoding failed for destination "${destinationValue}":`, error);
        // Try to get suggestions to see what's available
        const suggestions = await indoorGeocoder.getEnhancedAutocompleteResults(destinationValue, 3, includeOSM);
        console.log('Available suggestions for destination:', suggestions);
        throw new Error(`Could not find location "${destinationValue}". Check spelling or try a different name.`);
      }

      if (!departureGeo?.coordinates || !destinationGeo?.coordinates) {
        throw new Error("Invalid geocoding results");
      }

      // Ensure coordinates are properly formatted as numbers
      const start: [number, number] = [
        Number(departureGeo.coordinates[0]), 
        Number(departureGeo.coordinates[1])
      ];
      const end: [number, number] = [
        Number(destinationGeo.coordinates[0]), 
        Number(destinationGeo.coordinates[1])
      ];

      console.log('Final coordinates for routing:', { start, end });

      const route = await navigateToLocation(start, end, {
        profile: 'walking',
        overview: 'full',
        accessibleRoute: isAccessibleRoute
      });

      if (route) {
        setCurrentRoute(route);
        setRouteInstructions(route.instructions);
      }
    } catch (error) {
      console.error('Cross-building navigation failed:', error);
      alert('Could not find a route between these locations.');
    } finally {
      setIsNavigating(false);
    }
  };

  const clearRoute = () => {
    clearRouteFromMap();
    setCurrentRoute(null);
    setRouteInstructions([]);
  };

  const formatDuration = (seconds: number): string => {
    const minutes = Math.round(seconds / 60);
    return minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
  };

  const formatDistance = (meters: number): string => {
    return meters < 1000 ? `${Math.round(meters)} m` : `${(meters / 1000).toFixed(1)} km`;
  };

  const getInstructionIcon = (instruction: RouteInstruction) => {
    switch (instruction.type) {
      case 'indoor':
        return <Building className="h-4 w-4 text-green-600" />;
      case 'outdoor':
        return <Route className="h-4 w-4 text-blue-600" />;
      case 'transition':
        return <ArrowUpDown className="h-4 w-4 text-orange-600" />;
      default:
        return <Navigation className="h-4 w-4" />;
    }
  };

  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 border-b p-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleBackClick}
          className="h-8 w-8"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex flex-1 items-center gap-2">
          <Navigation className="h-5 w-5 text-blue-600" />
          <span className="font-semibold">Enhanced Navigation</span>
        </div>
        {currentRoute && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearRoute}
            className="text-red-600"
          >
            Clear Route
          </Button>
        )}
      </div>

      {/* Route Summary */}
      {currentRoute && (
        <div className="border-b bg-blue-50 p-4 dark:bg-blue-950">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-lg font-semibold text-blue-900 dark:text-blue-100">
                {formatDistance(currentRoute.totalDistance)}
              </div>
              <div className="text-sm text-blue-700 dark:text-blue-300">
                {formatDuration(currentRoute.totalDuration)}
              </div>
            </div>
            <div className="flex gap-2">
              {currentRoute.indoor.start && (
                <div className="rounded bg-green-100 px-2 py-1 text-xs text-green-800 dark:bg-green-900 dark:text-green-200">
                  Indoor Start
                </div>
              )}
              {currentRoute.outdoor.distance > 0 && (
                <div className="rounded bg-blue-100 px-2 py-1 text-xs text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                  Outdoor
                </div>
              )}
              {currentRoute.indoor.end && (
                <div className="rounded bg-red-100 px-2 py-1 text-xs text-red-800 dark:bg-red-900 dark:text-red-200">
                  Indoor End
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Navigation Inputs */}
      <div className="border-b p-4">
        <div className="space-y-3">
          {/* Current Location Toggle */}
          <div className="flex items-center gap-2">
            <Toggle
              pressed={useCurrentLocation}
              onPressedChange={handleCurrentLocationToggle}
              size="sm"
            >
              <MapPin className="h-4 w-4" />
            </Toggle>
            <span className="text-sm">Use current location</span>
          </div>

          {/* Departure Input */}
          {!useCurrentLocation && (
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2">
                <Dot className="h-4 w-4 text-green-600" />
              </div>
              <Input
                placeholder="From..."
                value={departureLocation}
                onChange={(e) => setDepartureLocation(e.target.value)}
                onFocus={() => setActiveInput("departure")}
                className="pl-10"
              />
            </div>
          )}

          {/* Swap Button */}
          {!useCurrentLocation && (
            <div className="flex justify-center">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleSwapLocations}
                className="h-8 w-8"
              >
                <ArrowUpDown className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Destination Input */}
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2">
              <Dot className="h-4 w-4 text-red-600" />
            </div>
            <Input
              placeholder="To..."
              value={destinationLocation}
              onChange={(e) => setDestinationLocation(e.target.value)}
              onFocus={() => setActiveInput("destination")}
              className="pl-10"
            />
          </div>

          {/* OpenStreetMap Toggle */}
          <div className="flex items-center gap-2">
            <Toggle
              pressed={includeOSM}
              onPressedChange={setIncludeOSM}
              size="sm"
            >
              <Globe className="h-4 w-4" />
            </Toggle>
            <span className="text-sm">Include OpenStreetMap locations</span>
          </div>

          {/* Accessibility Toggle */}
          <div className="flex items-center gap-2">
            <Toggle
              pressed={isAccessibleRoute}
              onPressedChange={setIsAccessibleRoute}
              size="sm"
            >
              <Accessibility className="h-4 w-4" />
            </Toggle>
            <span className="text-sm">Accessible route</span>
          </div>

          {/* Navigate Button */}
          <Button
            onClick={() => {
              console.log('Get Directions button clicked');
              handleCrossBuildingRouting(departureLocation, destinationLocation);
            }}
            disabled={isNavigating || (!departureLocation && !useCurrentLocation) || !destinationLocation}
            className="w-full"
          >
            {isNavigating ? "Finding Route..." : "Get Directions"}
          </Button>
        </div>
      </div>

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div className="border-b">
          <EnhancedSuggestionsList
            suggestions={suggestions}
            searchQuery={activeQuery}
            onSuggestionClick={handleSuggestionClick}
          />
        </div>
      )}

      {/* Route Instructions */}
      {routeInstructions.length > 0 && (
        <div className="flex-1 overflow-y-auto">
          <div className="p-4">
            <h3 className="mb-3 font-semibold">Turn-by-turn directions</h3>
            <div className="space-y-3">
              {routeInstructions.map((instruction, index) => (
                <div key={index} className="flex gap-3">
                  <div className="mt-1 flex-shrink-0">
                    {getInstructionIcon(instruction)}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm">{instruction.text}</div>
                    {instruction.distance && (
                      <div className="text-xs text-gray-500">
                        {formatDistance(instruction.distance)}
                        {instruction.duration && ` • ${formatDuration(instruction.duration)}`}
                      </div>
                    )}
                    {instruction.building && (
                      <div className="text-xs text-blue-600">
                        {instruction.building}
                        {instruction.floor && ` • Floor ${instruction.floor}`}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
