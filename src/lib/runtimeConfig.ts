const DEFAULT_BACKEND_ORIGIN = "http://127.0.0.1:8000";

const normalizeBackendOrigin = (value?: string) => {
  const fallback = DEFAULT_BACKEND_ORIGIN;
  const raw = value?.trim();
  if (!raw) return fallback;

  try {
    const normalized = new URL(raw);
    if (normalized.hostname === "localhost") {
      normalized.hostname = "127.0.0.1";
    }
    return normalized.toString().replace(/\/$/, "");
  } catch {
    return fallback;
  }
};

export const BACKEND_ORIGIN = normalizeBackendOrigin(import.meta.env.VITE_API_URL);
export const API_BASE = `${BACKEND_ORIGIN}/api/v1`;
