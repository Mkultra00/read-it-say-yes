import { create } from "zustand";

interface NarrationStore {
  isActive: boolean;
  audio: HTMLAudioElement | null;
  infiniteActive: { current: boolean };
  stopFn: (() => void) | null;
  setStopFn: (fn: (() => void) | null) => void;
  setActive: (active: boolean) => void;
  setAudio: (audio: HTMLAudioElement | null) => void;
  stop: () => void;
}

export const useNarrationStore = create<NarrationStore>((set, get) => ({
  isActive: false,
  audio: null,
  infiniteActive: { current: false },
  stopFn: null,
  setStopFn: (fn) => set({ stopFn: fn }),
  setActive: (active) => set({ isActive: active }),
  setAudio: (audio) => set({ audio }),
  stop: () => {
    const { audio, infiniteActive, stopFn } = get();
    // Always kill audio + infinite loop regardless of which page is mounted
    infiniteActive.current = false;
    if (audio) {
      try {
        audio.pause();
        audio.src = "";
      } catch {}
    }
    if (stopFn) stopFn();
    set({ isActive: false, audio: null });
  },
}));
