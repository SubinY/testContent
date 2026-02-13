export interface ThemeTokens {
  bg: string;
  bgGradientStart: string;
  bgGradientMid: string;
  bgGradientEnd: string;
  surface: string;
  surfaceMuted: string;
  card: string;
  cardAlt: string;
  text: string;
  muted: string;
  accent: string;
  accentHover: string;
  accentSoft: string;
  border: string;
  radius: string;
  radiusLarge: string;
  shadow: string;
  accentShadow: string;
  fontHeading: string;
  fontBody: string;
  screenshotBackground: string;
}

export interface ThemePreset {
  id: string;
  name: string;
  description?: string;
  tokens: ThemeTokens;
}

export interface ThemeOption {
  id: string;
  name: string;
  description?: string;
}

export const DEFAULT_THEME_ID = "warm-apricot";

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: "warm-apricot",
    name: "暖杏",
    description: "温暖柔和，适合通用测评内容",
    tokens: {
      bg: "#f8f3ea",
      bgGradientStart: "#f8f3ea",
      bgGradientMid: "#fffaf4",
      bgGradientEnd: "#eef5fb",
      surface: "#ffffff",
      surfaceMuted: "#fff8ee",
      card: "#fffefb",
      cardAlt: "#fffbeb",
      text: "#1f2937",
      muted: "#475569",
      accent: "#d97706",
      accentHover: "#b45309",
      accentSoft: "#ffedd5",
      border: "#dbe4ee",
      radius: "18px",
      radiusLarge: "26px",
      shadow: "0 14px 40px rgba(15, 23, 42, 0.08)",
      accentShadow: "0 14px 26px rgba(217, 119, 6, 0.24)",
      fontHeading: "\"Source Han Serif SC\", \"STSong\", \"Songti SC\", serif",
      fontBody: "\"Source Han Sans SC\", \"PingFang SC\", \"Hiragino Sans GB\", \"Microsoft YaHei\", sans-serif",
      screenshotBackground: "#f8f3ea"
    }
  },
  {
    id: "mint-breeze",
    name: "薄荷绿",
    description: "清爽明亮，偏健康/心理主题",
    tokens: {
      bg: "#ebf8f3",
      bgGradientStart: "#e6f8f0",
      bgGradientMid: "#f4fff9",
      bgGradientEnd: "#dff4ee",
      surface: "#ffffff",
      surfaceMuted: "#ecfdf5",
      card: "#f7fffb",
      cardAlt: "#dcfce7",
      text: "#134e4a",
      muted: "#2f5f5b",
      accent: "#0f766e",
      accentHover: "#115e59",
      accentSoft: "#ccfbf1",
      border: "#b7e5dd",
      radius: "18px",
      radiusLarge: "26px",
      shadow: "0 14px 36px rgba(15, 118, 110, 0.15)",
      accentShadow: "0 14px 24px rgba(15, 118, 110, 0.28)",
      fontHeading: "\"Source Han Serif SC\", \"STSong\", \"Songti SC\", serif",
      fontBody: "\"Source Han Sans SC\", \"PingFang SC\", \"Hiragino Sans GB\", \"Microsoft YaHei\", sans-serif",
      screenshotBackground: "#ebf8f3"
    }
  },
  {
    id: "klein-blue",
    name: "克莱因蓝",
    description: "高饱和蓝白对比，偏专业科技感",
    tokens: {
      bg: "#e9efff",
      bgGradientStart: "#dfe8ff",
      bgGradientMid: "#eef3ff",
      bgGradientEnd: "#f7faff",
      surface: "#ffffff",
      surfaceMuted: "#eef4ff",
      card: "#f9fbff",
      cardAlt: "#e0eaff",
      text: "#0f172a",
      muted: "#334155",
      accent: "#1d4ed8",
      accentHover: "#1e40af",
      accentSoft: "#dbeafe",
      border: "#c8d8ff",
      radius: "18px",
      radiusLarge: "26px",
      shadow: "0 16px 38px rgba(29, 78, 216, 0.16)",
      accentShadow: "0 14px 24px rgba(29, 78, 216, 0.28)",
      fontHeading: "\"Source Han Serif SC\", \"STSong\", \"Songti SC\", serif",
      fontBody: "\"Source Han Sans SC\", \"PingFang SC\", \"Hiragino Sans GB\", \"Microsoft YaHei\", sans-serif",
      screenshotBackground: "#e9efff"
    }
  },
  {
    id: "cream-butter",
    name: "奶油黄",
    description: "柔和暖黄，偏治愈生活风",
    tokens: {
      bg: "#fff8e8",
      bgGradientStart: "#fff8e8",
      bgGradientMid: "#fffef7",
      bgGradientEnd: "#fef3c7",
      surface: "#fffdf6",
      surfaceMuted: "#fff7d6",
      card: "#fffef8",
      cardAlt: "#fef3c7",
      text: "#3f2f1f",
      muted: "#6b543a",
      accent: "#ca8a04",
      accentHover: "#a16207",
      accentSoft: "#fef3c7",
      border: "#f3dd9c",
      radius: "20px",
      radiusLarge: "28px",
      shadow: "0 14px 38px rgba(202, 138, 4, 0.16)",
      accentShadow: "0 14px 24px rgba(202, 138, 4, 0.25)",
      fontHeading: "\"Source Han Serif SC\", \"STSong\", \"Songti SC\", serif",
      fontBody: "\"Source Han Sans SC\", \"PingFang SC\", \"Hiragino Sans GB\", \"Microsoft YaHei\", sans-serif",
      screenshotBackground: "#fff8e8"
    }
  },
  {
    id: "minimal-white",
    name: "极简白",
    description: "低饱和黑白灰，高克制风格",
    tokens: {
      bg: "#f5f6f8",
      bgGradientStart: "#f7f8fa",
      bgGradientMid: "#f3f4f6",
      bgGradientEnd: "#eceff3",
      surface: "#ffffff",
      surfaceMuted: "#f8fafc",
      card: "#ffffff",
      cardAlt: "#f8fafc",
      text: "#0f172a",
      muted: "#475569",
      accent: "#334155",
      accentHover: "#1f2937",
      accentSoft: "#e2e8f0",
      border: "#d8dee7",
      radius: "14px",
      radiusLarge: "18px",
      shadow: "0 8px 28px rgba(15, 23, 42, 0.06)",
      accentShadow: "0 10px 20px rgba(51, 65, 85, 0.18)",
      fontHeading: "\"Noto Serif SC\", \"Source Han Serif SC\", \"Songti SC\", serif",
      fontBody: "\"Noto Sans SC\", \"Source Han Sans SC\", \"PingFang SC\", sans-serif",
      screenshotBackground: "#f5f6f8"
    }
  },
  {
    id: "night-graphite",
    name: "暗色",
    description: "高对比深色调，偏夜间个性化",
    tokens: {
      bg: "#0f172a",
      bgGradientStart: "#0f172a",
      bgGradientMid: "#111827",
      bgGradientEnd: "#1f2937",
      surface: "#111827",
      surfaceMuted: "#1f2937",
      card: "#0b1220",
      cardAlt: "#172236",
      text: "#e2e8f0",
      muted: "#cbd5e1",
      accent: "#22d3ee",
      accentHover: "#06b6d4",
      accentSoft: "#083344",
      border: "#334155",
      radius: "18px",
      radiusLarge: "26px",
      shadow: "0 18px 44px rgba(2, 6, 23, 0.48)",
      accentShadow: "0 14px 28px rgba(34, 211, 238, 0.2)",
      fontHeading: "\"Noto Serif SC\", \"Source Han Serif SC\", \"Songti SC\", serif",
      fontBody: "\"Noto Sans SC\", \"Source Han Sans SC\", \"PingFang SC\", sans-serif",
      screenshotBackground: "#0f172a"
    }
  }
];

export function getThemeById(themeId?: string): ThemePreset {
  if (!themeId) {
    return THEME_PRESETS[0];
  }
  return THEME_PRESETS.find((theme) => theme.id === themeId) ?? THEME_PRESETS[0];
}

export function getThemeOptions(): ThemeOption[] {
  return THEME_PRESETS.map((theme) => ({
    id: theme.id,
    name: theme.name,
    description: theme.description
  }));
}

export function buildThemeCssVariables(theme: ThemePreset): string {
  const { tokens } = theme;
  return [
    `--bg: ${tokens.bg};`,
    `--bg-gradient-start: ${tokens.bgGradientStart};`,
    `--bg-gradient-mid: ${tokens.bgGradientMid};`,
    `--bg-gradient-end: ${tokens.bgGradientEnd};`,
    `--surface: ${tokens.surface};`,
    `--surface-muted: ${tokens.surfaceMuted};`,
    `--card: ${tokens.card};`,
    `--card-alt: ${tokens.cardAlt};`,
    `--text: ${tokens.text};`,
    `--muted: ${tokens.muted};`,
    `--accent: ${tokens.accent};`,
    `--accent-hover: ${tokens.accentHover};`,
    `--accent-soft: ${tokens.accentSoft};`,
    `--border: ${tokens.border};`,
    `--radius: ${tokens.radius};`,
    `--radius-lg: ${tokens.radiusLarge};`,
    `--shadow: ${tokens.shadow};`,
    `--accent-shadow: ${tokens.accentShadow};`,
    `--font-heading: ${tokens.fontHeading};`,
    `--font-body: ${tokens.fontBody};`
  ].join("\n      ");
}
