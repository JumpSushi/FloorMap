import React, { useState, useCallback } from 'react';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { useConcept3DWayfinding } from '~/hooks/use-concept3d-wayfinding';
import { Concept3DRoute } from '~/services/concept3d-wayfinding';
import { NavigationInstructions } from './navigation-instructions';
import { RouteSegments } from './route-segments';

interface Concept3DWayfindingDemoProps {
  onRouteGenerated?: (route: Concept3DRoute) => void;
}

export function Concept3DWayfindingDemo({ onRouteGenerated }: Concept3DWayfindingDemoProps) {
  const [fromLat, setFromLat] = useState('38.907677');
  const [fromLng, setFromLng] = useState('-77.068962');
  const [toLat, setToLat] = useState('38.909557');
  const [toLng, setToLng] = useState('-77.073502');
  const [route, setRoute] = useState<Concept3DRoute | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { getDirections, getInstructions, getRouteDetails } = useConcept3DWayfinding();

  const handleGetDirections = useCallback(async () => {
    if (!fromLat || !fromLng || !toLat || !toLng) {
      setError('Please enter all coordinates');
      return;
    }

    setLoading(true);
    setError(null);
    setRoute(null);

    try {
      const from: [number, number] = [parseFloat(fromLng), parseFloat(fromLat)];
      const to: [number, number] = [parseFloat(toLng), parseFloat(toLat)];

      console.log('🎯 Requesting Concept3D directions:', { from, to });
      
      const newRoute = await getDirections(from, to, {
        mode: 'walking'
      });

      setRoute(newRoute);
      onRouteGenerated?.(newRoute);
      
      console.log('✅ Route generated successfully:', getRouteDetails(newRoute));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get directions';
      setError(errorMessage);
      console.error('❌ Route generation failed:', err);
    } finally {
      setLoading(false);
    }
  }, [fromLat, fromLng, toLat, toLng, getDirections, getRouteDetails, onRouteGenerated]);

  const handleUseExampleCoordinates = () => {
    setFromLat('38.907677');
    setFromLng('-77.068962');
    setToLat('38.909557');
    setToLng('-77.073502');
  };

  const routeDetails = route ? getRouteDetails(route) : null;
  const instructions = route ? getInstructions(route) : [];

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Concept3D Official Wayfinding API Demo</CardTitle>
        <CardDescription>
          Test the official Concept3D wayfinding API for outdoor directions
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Coordinates Input */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">From Coordinates</label>
            <div className="space-y-2">
              <Input
                placeholder="Latitude"
                value={fromLat}
                onChange={(e) => setFromLat(e.target.value)}
                type="number"
                step="any"
              />
              <Input
                placeholder="Longitude"
                value={fromLng}
                onChange={(e) => setFromLng(e.target.value)}
                type="number"
                step="any"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">To Coordinates</label>
            <div className="space-y-2">
              <Input
                placeholder="Latitude"
                value={toLat}
                onChange={(e) => setToLat(e.target.value)}
                type="number"
                step="any"
              />
              <Input
                placeholder="Longitude"
                value={toLng}
                onChange={(e) => setToLng(e.target.value)}
                type="number"
                step="any"
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button onClick={handleGetDirections} disabled={loading}>
            {loading ? 'Getting Directions...' : 'Get Directions'}
          </Button>
          <Button variant="outline" onClick={handleUseExampleCoordinates}>
            Use Example Coordinates
          </Button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700">
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* Route Details */}
        {routeDetails && (
          <div className="space-y-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded">
              <h3 className="font-medium text-green-800 mb-2">Route Details</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <strong>Distance:</strong> {routeDetails.distance}m
                </div>
                <div>
                  <strong>Duration:</strong> {routeDetails.formattedDuration}
                </div>
                <div>
                  <strong>Provider:</strong> {routeDetails.provider}
                </div>
                <div>
                  <strong>Segments:</strong> {routeDetails.totalSegments}
                </div>
                <div>
                  <strong>Path Points:</strong> {routeDetails.fullPathPoints}
                </div>
                <div>
                  <strong>Pivot Points:</strong> {routeDetails.pivotPoints}
                </div>
              </div>
            </div>

            {/* Turn-by-Turn Instructions using reusable component */}
            <NavigationInstructions 
              instructions={instructions}
              maxInitialItems={2}
              className="border-t pt-4"
            />

            {/* Route Segments using reusable component */}
            <RouteSegments 
              segments={routeDetails.segments}
              maxInitialItems={2}
              className="border-t pt-4"
            />
          </div>
        )}

        {/* API Information */}
        <div className="text-xs text-gray-500 space-y-1">
          <div><strong>API Endpoint:</strong> https://api.concept3d.com/wayfinding/v2</div>
          <div><strong>Example URL:</strong></div>
          <div className="font-mono bg-gray-100 p-2 rounded break-all">
            https://api.concept3d.com/wayfinding/v2?map=999&stamp=NOU5Cneg&fromLevel=0&toLevel=0&currentLevel=0&toLat=38.909557&toLng=-77.073502&fromLat=38.907677&fromLng=-77.068962&mode=walking&getThirdParty=true&mapType=mapboxgl&key=0001085cc708b9cef47080f064612ca5
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default Concept3DWayfindingDemo;
