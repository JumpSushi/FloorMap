import React, { useState } from 'react';
import { Button } from '~/components/ui/button';
import { ChevronDown, ChevronUp, Route, Clock, MapPin } from 'lucide-react';

interface RouteSegment {
  action: string;
  distance?: number;
  formattedDistance: string;
  duration?: number;
  formattedDuration: string;
  modifier: string;
  type?: string;
  coordinateCount?: number;
}

interface RouteSegmentsProps {
  segments: RouteSegment[];
  title?: string;
  maxInitialItems?: number;
  className?: string;
  showCoordinateCount?: boolean;
}

/**
 * Reusable component for displaying route segments with collapsible functionality
 * Shows only the first few segments initially with option to expand
 */
export function RouteSegments({
  segments,
  title = "Route Segments",
  maxInitialItems = 2,
  className = "",
  showCoordinateCount = true
}: RouteSegmentsProps) {
  const [showAll, setShowAll] = useState(false);
  
  if (!segments || segments.length === 0) {
    return null;
  }

  const hasMoreSegments = segments.length > maxInitialItems;
  const displayedSegments = showAll ? segments : segments.slice(0, maxInitialItems);
  const remainingCount = segments.length - maxInitialItems;

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Header with expand/collapse button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Route className="w-4 h-4 text-green-600" />
          <h3 className="font-medium text-gray-900">{title}</h3>
          <span className="text-sm text-gray-500">({segments.length} segments)</span>
        </div>
        {hasMoreSegments && (
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowAll(!showAll)}
            className="text-xs"
          >
            {showAll ? (
              <>
                <ChevronUp className="w-3 h-3 mr-1" />
                Show Less
              </>
            ) : (
              <>
                <ChevronDown className="w-3 h-3 mr-1" />
                Show More ({remainingCount})
              </>
            )}
          </Button>
        )}
      </div>

      {/* Segments list */}
      <div className="space-y-2 max-h-80 overflow-y-auto">
        {displayedSegments.map((segment, index) => (
          <div
            key={index}
            className="p-3 bg-gray-50 hover:bg-gray-100 rounded-lg text-sm transition-colors"
          >
            <div className="flex justify-between items-start gap-3">
              <div className="flex-1">
                <div className="font-medium text-gray-900 mb-1">
                  {segment.action}
                </div>
                <div className="flex items-center gap-3 text-gray-600 text-xs">
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {segment.formattedDistance}
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {segment.formattedDuration}
                  </div>
                  {segment.modifier && (
                    <div className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                      {segment.modifier}
                    </div>
                  )}
                </div>
              </div>
              {showCoordinateCount && segment.coordinateCount && (
                <div className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded">
                  {segment.coordinateCount} pts
                </div>
              )}
            </div>
          </div>
        ))}
        
        {/* Show more button in list */}
        {!showAll && hasMoreSegments && (
          <div className="text-center py-2">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setShowAll(true)}
              className="text-green-600 hover:text-green-800 text-xs"
            >
              <ChevronDown className="w-3 h-3 mr-1" />
              Show {remainingCount} more segments
            </Button>
          </div>
        )}
      </div>

      {/* Footer info when expanded */}
      {showAll && hasMoreSegments && (
        <div className="text-center pt-2">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setShowAll(false)}
            className="text-gray-500 hover:text-gray-700 text-xs"
          >
            <ChevronUp className="w-3 h-3 mr-1" />
            Show less
          </Button>
        </div>
      )}
    </div>
  );
}

export default RouteSegments;
