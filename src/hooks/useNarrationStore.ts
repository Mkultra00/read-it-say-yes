import { create } from "zustand";

interface NarrationStore {
  isActive: boolean;
  stopFn: (() => void) | null;
  setStopFn: (fn: (() => void) | null) => void;
  setActive: (active: boolean) => void;
  stop: () => void;
}

export const useNarrationStore = create<NarrationStore>((set, get) => ({
  isActive: false,
  stopFn: null,
  setStopFn: (fn) => set({ stopFn: fn }),
  setActive: (active) => set({ isActive: active }),
  stop: () => {
    const fn = get().stopFn;
    if (fn) fn();
    set({ isActive: false });
  },
}));
