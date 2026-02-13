export type RunMode = "api" | "local";

function normalizeRunMode(value: string | undefined): RunMode {
  return value === "local" ? "local" : "api";
}

export function getServerRunMode(): RunMode {
  return normalizeRunMode(process.env.RUN_MODE);
}

export function getClientDefaultRunMode(): RunMode {
  return normalizeRunMode(process.env.NEXT_PUBLIC_RUN_MODE);
}

export function shouldForceLocalByRunMode(): boolean {
  return getServerRunMode() === "local";
}
