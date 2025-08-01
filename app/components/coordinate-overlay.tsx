import { useEffect, useState } from "react";
import useMapStore from "~/stores/use-map-store";

export default function CoordinateOverlay() {
  const map = useMapStore((state) => state.mapInstance);
  const [coordinates, setCoordinates] = useState<{ lng: number; lat: number } | null>(null);
  const [zoom, setZoom] = useState<number>(0);
  const [clickedFeature, setClickedFeature] = useState<any>(null);

  useEffect(() => {
    if (!map) return;

    const handleMouseMove = (e: any) => {
      setCoordinates({
        lng: e.lngLat.lng,
        lat: e.lngLat.lat,
      });
      setZoom(map.getZoom());
    };

    const handleClick = (e: any) => {
      const features = map.queryRenderedFeatures(e.point);
      if (features.length > 0) {
        setClickedFeature(features[0]);
      } else {
        setClickedFeature(null);
      }
    };

    map.on('mousemove', handleMouseMove);
    map.on('click', handleClick);

    return () => {
      map.off('mousemove', handleMouseMove);
      map.off('click', handleClick);
    };
  }, [map]);

  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  if (!coordinates) return null;

  return (
    <div className="fixed top-20 right-4 z-50 bg-black bg-opacity-90 text-white p-4 rounded-lg text-xs font-mono max-w-80 space-y-2">
      {/* Coordinates */}
      <div className="border-b border-gray-600 pb-2">
        <div className="text-yellow-400 font-bold mb-1">COORDINATES</div>
        <div>Lng: {coordinates.lng.toFixed(8)}</div>
        <div>Lat: {coordinates.lat.toFixed(8)}</div>
        <div>Zoom: {zoom.toFixed(2)}</div>
      </div>

      {/* Clicked Feature Info */}
      {clickedFeature && (
        <div className="border-b border-gray-600 pb-2">
          <div className="text-green-400 font-bold mb-1">CLICKED FEATURE</div>
          <div>ID: {clickedFeature.id || 'null'}</div>
          <div>Layer: {clickedFeature.layer?.id || 'unknown'}</div>
          <div>Source: {clickedFeature.source || 'unknown'}</div>
          {clickedFeature.properties?.name && (
            <div>Name: {clickedFeature.properties.name}</div>
          )}
          {clickedFeature.properties?.building_id && (
            <div>Building: {clickedFeature.properties.building_id}</div>
          )}
          {clickedFeature.properties?.level_id && (
            <div>Level: {clickedFeature.properties.level_id}</div>
          )}
          {clickedFeature.properties?.feature_type && (
            <div>Type: {clickedFeature.properties.feature_type}</div>
          )}
        </div>
      )}

      {/* Copy Coordinates Button */}
      <div className="pt-1">
        <button
          onClick={() => {
            const coordText = `[${coordinates.lng.toFixed(8)}, ${coordinates.lat.toFixed(8)}]`;
            navigator.clipboard.writeText(coordText);
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-xs"
        >
          Copy Coords
        </button>
        {clickedFeature && (
          <button
            onClick={() => {
              const featureInfo = JSON.stringify(clickedFeature, null, 2);
              navigator.clipboard.writeText(featureInfo);
            }}
            className="bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded text-xs ml-2"
          >
            Copy Feature
          </button>
        )}
      </div>
    </div>
  );
}
