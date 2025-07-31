import { create } from "zustand";

interface FloorState {
  currentFloor: string | number; // Allow both string and number floor levels
  setCurrentFloor: (floor: string | number) => void;
}

const useFloorStore = create<FloorState>((set) => ({
  currentFloor: 1, // Start at floor 1 (G and M removed for now)
  setCurrentFloor: (floor) => set({ currentFloor: floor }),
}));

export default useFloorStore;
