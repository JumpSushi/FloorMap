import { useEffect, useState } from "react";
import useFloorStore from "~/stores/floor-store";
import IndoorMapLayer from "~/layers/indoor-map-layer";
import POIsLayer from "~/layers/pois-layer";

interface FloorSelectorProps {
  indoorMapLayer: IndoorMapLayer;
  poisLayer: POIsLayer;
}

export function FloorSelector({ indoorMapLayer, poisLayer }: FloorSelectorProps) {
  const { currentFloor, setCurrentFloor } = useFloorStore();
  // Define available floors in order from top to bottom
  const availableFloors = [
    { value: 6, label: 'Floor 6' },
    { value: 5, label: 'Floor 5' },
    { value: 4, label: 'Floor 4' },
    { value: 3, label: 'Floor 3' },
    { value: 2, label: 'Floor 2' },
    { value: 1, label: 'Floor 1' },
    { value: 'M', label: 'Mezzanine' },
    { value: 'G', label: 'Ground' },
    { value: 'B', label: 'Basement' }
  ];

  const handleFloorChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const floor = event.target.value;
    // Convert to number if it's a numeric string
    const floorValue = /^\d+$/.test(floor) ? Number.parseInt(floor) : floor;
    setCurrentFloor(floorValue);
    indoorMapLayer.setFloorLevel(floorValue);
    poisLayer.setFloorLevel(floorValue); // Also update POI visibility
  };
  return (
    <div className="absolute right-2 top-2 z-10">
      <select
        value={currentFloor}
        onChange={handleFloorChange}
        className="rounded-md border bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none dark:bg-gray-900"
      >
        {availableFloors.map((floor) => (
          <option key={floor.value} value={floor.value}>
            {floor.label}
          </option>
        ))}
      </select>
    </div>
  );
}
