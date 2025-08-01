import { create } from "zustand";

interface FloorState {
  currentFloor: string | number; // Allow both string and number floor levels
  setCurrentFloor: (floor: string | number) => void;
}

const useFloorStore = create<FloorState>((set) => ({
  currentFloor: 'G', // Start at Ground floor to match REISS building level
  setCurrentFloor: (floor) => set({ currentFloor: floor }),
}));

export default useFloorStore;
