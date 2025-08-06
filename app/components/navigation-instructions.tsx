import React, { useState } from 'react';
import { Button } from '~/components/ui/button';
import { ChevronDown, ChevronUp, Navigation } from 'lucide-react';

interface NavigationInstructionsProps {
  instructions: string[];
  title?: string;
  maxInitialItems?: number;
  className?: string;
  showStepNumbers?: boolean;
}

/**
 * Reusable component for displaying navigation instructions with collapsible functionality
 * Shows only the first few instructions initially with option to expand
 */
export function NavigationInstructions({
  instructions,
  title = "Turn-by-Turn Instructions",
  maxInitialItems = 2,
  className = "",
  showStepNumbers = true
}: NavigationInstructionsProps) {
  const [showAll, setShowAll] = useState(false);
  
  if (!instructions || instructions.length === 0) {
    return null;
  }

  const hasMoreInstructions = instructions.length > maxInitialItems;
  const displayedInstructions = showAll ? instructions : instructions.slice(0, maxInitialItems);
  const remainingCount = instructions.length - maxInitialItems;

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Header with expand/collapse button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Navigation className="w-4 h-4 text-blue-600" />
          <h3 className="font-medium text-gray-900">{title}</h3>
          <span className="text-sm text-gray-500">({instructions.length} steps)</span>
        </div>
        {hasMoreInstructions && (
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

      {/* Instructions list */}
      <div className="space-y-2 max-h-80 overflow-y-auto">
        {displayedInstructions.map((instruction, index) => (
          <div
            key={index}
            className="flex items-start gap-3 p-3 bg-gray-50 hover:bg-gray-100 rounded-lg text-sm transition-colors"
          >
            {showStepNumbers && (
              <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-medium">
                {index + 1}
              </div>
            )}
            <div className="flex-1 text-gray-700 leading-relaxed">
              {instruction}
            </div>
          </div>
        ))}
        
        {/* Show more button in list (alternative placement) */}
        {!showAll && hasMoreInstructions && (
          <div className="text-center py-2">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setShowAll(true)}
              className="text-blue-600 hover:text-blue-800 text-xs"
            >
              <ChevronDown className="w-3 h-3 mr-1" />
              Show {remainingCount} more steps
            </Button>
          </div>
        )}
      </div>

      {/* Footer info when expanded */}
      {showAll && hasMoreInstructions && (
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

export default NavigationInstructions;
