export interface VisualTheme {
  key: string;
  background: string;
  surface: string;
  text: string;
  accent: string;
}

export const THEMES: VisualTheme[] = [
  {
    key: "amber-sand",
    background: "#f8f3ea",
    surface: "#fffdf8",
    text: "#1f2a35",
    accent: "#d97706"
  },
  {
    key: "mint-paper",
    background: "#eff8f4",
    surface: "#f8fffc",
    text: "#19322b",
    accent: "#0f766e"
  },
  {
    key: "sky-ink",
    background: "#eef4fb",
    surface: "#f7fbff",
    text: "#1b2b48",
    accent: "#2563eb"
  },
  {
    key: "rose-clay",
    background: "#fbf0ef",
    surface: "#fff8f7",
    text: "#3d1f2a",
    accent: "#be185d"
  },
  {
    key: "slate-air",
    background: "#f3f6f8",
    surface: "#ffffff",
    text: "#1f2937",
    accent: "#0f766e"
  }
];

export function pickTheme(index: number): VisualTheme {
  return THEMES[index % THEMES.length];
}
