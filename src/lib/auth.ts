export const isFetchError = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  return message.toLowerCase().includes("failed to fetch");
};

const getAuthStorageKeys = () =>
  Object.keys(localStorage).filter((key) => key.startsWith("sb-"));

const readRefreshToken = (raw: string): string | null => {
  try {
    const parsed = JSON.parse(raw) as {
      refresh_token?: string;
      currentSession?: { refresh_token?: string };
    };

    if (typeof parsed.refresh_token === "string") return parsed.refresh_token;
    if (typeof parsed.currentSession?.refresh_token === "string") {
      return parsed.currentSession.refresh_token;
    }
  } catch {
    return null;
  }

  return null;
};

export const clearAuthCache = () => {
  getAuthStorageKeys().forEach((key) => localStorage.removeItem(key));
};

export const clearCorruptedAuthCache = () => {
  const hasCorruptedToken = getAuthStorageKeys().some((key) => {
    if (!key.endsWith("-auth-token")) return false;

    const raw = localStorage.getItem(key);
    if (!raw) return false;

    const refreshToken = readRefreshToken(raw);
    return typeof refreshToken === "string" && refreshToken.length < 30;
  });

  if (hasCorruptedToken) clearAuthCache();

  return hasCorruptedToken;
};
