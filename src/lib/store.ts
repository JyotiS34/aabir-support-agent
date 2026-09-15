"use client";

import { create } from "zustand";

export type ViewId =
  | "inbox"
  | "playground"
  | "analytics"
  | "evaluation"
  | "abtest"
  | "feedback"
  | "settings"
  | "report"
  | "decisions";

export interface Settings {
  githubRepoUrl: string;
  // A/B cost weights (per message)
  costWrongAuto: number;
  costHumanReview: number;
  costGoodAuto: number; // negative = benefit
  // Currently-deployed confidence threshold
  deployedThreshold: number;
  // Brand display name
  brandName: string;
  brandHandle: string;
}

const DEFAULT_SETTINGS: Settings = {
  githubRepoUrl: "https://github.com/your-org/aabir-support-agent",
  costWrongAuto: 25,
  costHumanReview: 4,
  costGoodAuto: -2,
  deployedThreshold: 0.6,
  brandName: "Amazon Help",
  brandHandle: "@AmazonHelp",
};

function loadSettings(): Settings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem("aabir-settings");
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

interface AppState {
  view: ViewId;
  selectedTweetId: string | null;
  sidebarOpen: boolean;
  theme: "light" | "dark";
  settings: Settings;
  setView: (v: ViewId) => void;
  selectTweet: (id: string | null) => void;
  setSidebarOpen: (open: boolean) => void;
  toggleTheme: () => void;
  setTheme: (t: "light" | "dark") => void;
  updateSettings: (patch: Partial<Settings>) => void;
  resetSettings: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  view: "inbox",
  selectedTweetId: null,
  sidebarOpen: false,
  theme: "light",
  settings: DEFAULT_SETTINGS,
  setView: (v) => set({ view: v, selectedTweetId: v === "inbox" ? get().selectedTweetId : null }),
  selectTweet: (id) => set({ selectedTweetId: id }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleTheme: () => {
    const next = get().theme === "light" ? "dark" : "light";
    set({ theme: next });
    if (typeof document !== "undefined") {
      document.documentElement.classList.toggle("dark", next === "dark");
    }
  },
  setTheme: (t) => {
    set({ theme: t });
    if (typeof document !== "undefined") {
      document.documentElement.classList.toggle("dark", t === "dark");
    }
  },
  updateSettings: (patch) => {
    const next = { ...get().settings, ...patch };
    set({ settings: next });
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem("aabir-settings", JSON.stringify(next));
      } catch {
        // ignore quota errors
      }
    }
  },
  resetSettings: () => {
    set({ settings: DEFAULT_SETTINGS });
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("aabir-settings");
    }
  },
}));

// Initialize settings from localStorage on the client (call once in a top-level effect).
export function hydrateSettings() {
  if (typeof window === "undefined") return;
  const loaded = loadSettings();
  useAppStore.setState({ settings: loaded });
}

