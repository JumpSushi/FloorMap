import { POI } from "~/types/poi";
import { Button } from "../ui/button";
import { Building, Globe, MapPin } from "lucide-react";

interface EnhancedSuggestionsListProps {
  suggestions: Array<POI & { source?: string; address?: string }>;
  searchQuery: string;
  onSuggestionClick: (suggestion: POI & { source?: string; address?: string }) => void;
}

export default function EnhancedSuggestionsList({
  suggestions,
  searchQuery,
  onSuggestionClick,
}: EnhancedSuggestionsListProps) {
  const getSourceIcon = (source?: string) => {
    switch (source) {
      case 'indoor':
        return <Building className="h-3 w-3 text-green-600" />;
      case 'osm':
        return <Globe className="h-3 w-3 text-blue-600" />;
      default:
        return <MapPin className="h-3 w-3 text-gray-600" />;
    }
  };

  const getSourceLabel = (source?: string) => {
    switch (source) {
      case 'indoor':
        return 'Indoor';
      case 'osm':
        return 'OpenStreetMap';
      default:
        return 'Location';
    }
  };

  return (
    <div className="space-y-2">
      {suggestions.map((suggestion, index) => (
        <Button
          key={`${suggestion.source}-${suggestion.id}-${index}`}
          variant="ghost"
          className="w-full justify-start text-left text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
          onMouseDown={() => onSuggestionClick(suggestion)}
        >
          <div className="flex items-start gap-2 w-full">
            <div className="mt-1 flex-shrink-0">
              {getSourceIcon(suggestion.source)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{suggestion.name}</div>
              {suggestion.address && (
                <div className="text-xs text-gray-500 truncate mt-1">
                  {suggestion.address}
                </div>
              )}
              <div className="text-xs text-gray-400 mt-1">
                {getSourceLabel(suggestion.source)}
              </div>
            </div>
          </div>
        </Button>
      ))}
      {suggestions.length === 0 && searchQuery && (
        <div className="p-4 text-sm text-gray-500 dark:text-gray-300 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <MapPin className="h-4 w-4" />
            <span>No results found</span>
          </div>
          <p className="text-xs">
            Try a different search term or enable OpenStreetMap locations
          </p>
        </div>
      )}
    </div>
  );
}
