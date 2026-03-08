import { create } from "zustand";

export interface VoiceOption {
  id: string;
  name: string;
  description: string;
}

export const VOICE_OPTIONS: VoiceOption[] = [
  { id: "EXAVITQu4vr4xnSDxMaL", name: "Sarah", description: "Warm & gentle female" },
  { id: "FGY2WhTYpPnrIDTdsKH5", name: "Laura", description: "Calm & soothing female" },
  { id: "pFZP5JQG7iQjIQuC4Bku", name: "Lily", description: "Soft & caring female" },
  { id: "XrExE9yKIg1WjnnlVkGX", name: "Matilda", description: "Friendly & warm female" },
  { id: "JBFqnCBsd6RMkjVDRZzb", name: "George", description: "Deep & reassuring male" },
  { id: "CwhRBWXzGAHq8TQ4Fs17", name: "Roger", description: "Warm & steady male" },
  { id: "onwK4e9ZLuTAKqWW03F9", name: "Daniel", description: "Gentle & composed male" },
  { id: "nPczCjzI2devNBz1zQrb", name: "Brian", description: "Kind & comforting male" },
];

const STORAGE_KEY = "neurovoice-selected-voice";

function getStoredVoice(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) || VOICE_OPTIONS[0].id;
  } catch {
    return VOICE_OPTIONS[0].id;
  }
}

interface VoiceStore {
  selectedVoiceId: string;
  setSelectedVoiceId: (id: string) => void;
}

export const useVoiceStore = create<VoiceStore>((set) => ({
  selectedVoiceId: getStoredVoice(),
  setSelectedVoiceId: (id: string) => {
    localStorage.setItem(STORAGE_KEY, id);
    set({ selectedVoiceId: id });
  },
}));
