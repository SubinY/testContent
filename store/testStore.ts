import { create } from "zustand";

import type { GeneratedTest } from "@/types";

interface TestStoreState {
  currentTest: GeneratedTest | null;
  activeVariantId: string | null;
  isGenerating: boolean;
  progress: number;
  progressMessage: string;
  streamEvents: string[];
  setGenerating: (value: boolean) => void;
  setProgress: (value: number, message?: string) => void;
  addStreamEvent: (message: string) => void;
  setCurrentTest: (value: GeneratedTest | null) => void;
  setActiveVariant: (variantId: string | null) => void;
  resetGeneration: () => void;
}

export const useTestStore = create<TestStoreState>((set) => ({
  currentTest: null,
  activeVariantId: null,
  isGenerating: false,
  progress: 0,
  progressMessage: "等待开始",
  streamEvents: [],
  setGenerating: (value) => set({ isGenerating: value }),
  setProgress: (value, message) =>
    set((state) => ({
      progress: Math.max(0, Math.min(100, Math.floor(value))),
      progressMessage: message ?? state.progressMessage
    })),
  addStreamEvent: (message) =>
    set((state) => ({
      streamEvents: [message, ...state.streamEvents].slice(0, 16)
    })),
  setCurrentTest: (value) =>
    set({
      currentTest: value,
      activeVariantId: value?.variants[0]?.id ?? null
    }),
  setActiveVariant: (variantId) => set({ activeVariantId: variantId }),
  resetGeneration: () =>
    set({
      isGenerating: false,
      progress: 0,
      progressMessage: "等待开始",
      streamEvents: []
    })
}));
