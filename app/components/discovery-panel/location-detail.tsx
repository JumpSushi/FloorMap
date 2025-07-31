import { Link, Navigation2, QrCode, Share2, X } from "lucide-react";
import { POI } from "~/types/poi";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

interface LocationDetailProps {
  selectedPOI: POI;
  handleBackClick: () => void;
  handleDirectionsClick: () => void;
}
export default function LocationDetail({
  selectedPOI,
  handleBackClick,
  handleDirectionsClick,
}: LocationDetailProps) {
  // Check if this is Darnall Hall or Reiss Science Building
  const isDarnallHall = selectedPOI.name.toLowerCase().includes('darnall');
  const isReissScienceBuilding = selectedPOI.name.toLowerCase().includes('reiss');
  
  return (
    <div className="space-y-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">{selectedPOI.name}</h2>
          {/* Remove "1st Floor" title for special buildings, show floor for others */}
          {!isDarnallHall && !isReissScienceBuilding && (
            <p className="text-xs text-gray-600 dark:text-gray-400">
              {selectedPOI.floor ? `Floor ${selectedPOI.floor}` : '1st Floor'}
            </p>
          )}
        </div>
        <div className="flex space-x-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full p-2 hover:bg-gray-200 dark:hover:bg-gray-700"
              >
                <Share2 size={16} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {/*TODO: add logic*/}
              <DropdownMenuItem onClick={() => console.log("TODO: QR Code")}>
                <QrCode className="mr-2 size-4" />
                <span>QR Code</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => console.log("TODO: Copy Link")}>
                <Link className="mr-2 size-4" />
                <span>Copy Link</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant="ghost"
            onClick={handleBackClick}
            size="icon"
            className="rounded-full p-2 hover:bg-gray-200 dark:hover:bg-gray-700"
          >
            <X size={16} />
          </Button>
        </div>
      </div>
      
      {/* Darnall Hall specific content */}
      {isDarnallHall && (
        <div className="space-y-4">
          {/* Image */}
          <div className="w-full">
            <img 
              src="/images/darnall.jpeg" 
              alt="Darnall Hall"
              className="w-full h-48 object-cover rounded-lg shadow-md"
              onError={(e) => {
                // Fallback if image doesn't exist
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
          
          {/* About section */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">About</h3>
            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
              Darnall Hall is a residence hall for first-year students. The hall also features a restaurant, Epicurean, the Student Health Center, the Office of Institutional Diversity and Equity, and Counseling and Psychiatric Services.
            </p>
            
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-medium">Construction Date:</span>
                <span className="ml-2 text-gray-600 dark:text-gray-400">1964</span>
              </div>
              <div>
                <span className="font-medium">Address:</span>
                <span className="ml-2 text-gray-600 dark:text-gray-400">1625 TONDORF ROAD NW</span>
              </div>
            </div>
            
            <div className="pt-2">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                For more information please visit:{" "}
                <a 
                  href="https://residentialliving.georgetown.edu/communities/firstyear/darnall/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline"
                >
                  residentialliving.georgetown.edu
                </a>
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* Reiss Science Building specific content */}
      {isReissScienceBuilding && (
        <div className="space-y-4">
          {/* Image */}
          <div className="w-full">
            <img 
              src="/images/reiss.jpeg" 
              alt="Reiss Science Building"
              className="w-full h-48 object-cover rounded-lg shadow-md"
              onError={(e) => {
                // Fallback if image doesn't exist
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
          
          {/* About section */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">About</h3>
            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
              The Reiss Science Building contains classrooms, science labs, a nuclear accelerator vault and a greenhouse. The Blommer Science Library and the offices of the departments of biology, chemistry and physics are housed in the Reiss Science Building.
            </p>
            
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-medium">Construction Date:</span>
                <span className="ml-2 text-gray-600 dark:text-gray-400">1962</span>
              </div>
              <div>
                <span className="font-medium">Address:</span>
                <span className="ml-2 text-gray-600 dark:text-gray-400">1551 TONDORF ROAD NW</span>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <Button
        className="w-full rounded-full"
        onClick={handleDirectionsClick}
        variant="primary"
      >
        <Navigation2 className="mr-2" size={18} />
        Directions
      </Button>
    </div>
  );
}
