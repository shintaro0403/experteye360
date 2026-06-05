import { useCallback, useEffect, useRef, useState } from "react";
import {
  STORAGE_REFRESH_DEBOUNCE_MS,
  createDebounced,
  prependResponse,
  resolveRefreshMode,
  resolveResponsesRoomId,
  shouldShowBlockingLoader,
  type RefreshScope,
} from "./appDataLoad";
import type { AppSettings, ParticipantSubmission } from "./types";
import {
  loadSettings,
  appendResponseAsync,
  loadResponsesAsync,
  loadSettingsAsync,
  saveResponsesAsync,
  saveSettingsAsync,
} from "./storage";

export type UseAppDataOptions = {
  adminToken?: string | null;
};

export function useAppData(options: UseAppDataOptions = {}) {
  const [settings, setSettingsState] = useState<AppSettings>(() => loadSettings());
  const [responses, setResponsesState] = useState<ParticipantSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedOnceRef = useRef(false);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const refresh = useCallback(async (input?: { scope?: RefreshScope }) => {
    const mode = resolveRefreshMode(hasLoadedOnceRef.current);
    const scope = input?.scope ?? "all";
    const { adminToken } = optionsRef.current;
    setRefreshing(true);
    try {
      if (shouldShowBlockingLoader(mode)) {
        setLoading(true);
      }
      setError(null);

      const nextSettings = await loadSettingsAsync();
      setSettingsState(nextSettings);
      if (scope === "all" && adminToken?.trim()) {
        const roomId = resolveResponsesRoomId(nextSettings);
        const nextResponses = await loadResponsesAsync({
          roomId,
          adminToken,
        });
        setResponsesState(nextResponses);
      }
      hasLoadedOnceRef.current = true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "データの読み込みに失敗しました");
    } finally {
      setRefreshing(false);
      if (shouldShowBlockingLoader(mode)) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    hasLoadedOnceRef.current = false;
    void refresh();
  }, [options.adminToken, refresh]);

  useEffect(() => {
    const debounced = createDebounced(() => {
      void refresh({ scope: "all" });
    }, STORAGE_REFRESH_DEBOUNCE_MS);
    const onStorage = () => {
      debounced();
    };
    window.addEventListener("expertEye360-storage", onStorage);
    window.addEventListener("storage", onStorage);
    return () => {
      debounced.cancel();
      window.removeEventListener("expertEye360-storage", onStorage);
      window.removeEventListener("storage", onStorage);
    };
  }, [refresh]);

  const applySettings = useCallback((next: AppSettings) => {
    setSettingsState(next);
  }, []);

  const setSettings = useCallback(async (next: AppSettings) => {
    await saveSettingsAsync(next, { adminToken: optionsRef.current.adminToken });
    setSettingsState(next);
  }, []);

  const addResponse = useCallback(async (r: ParticipantSubmission) => {
    await appendResponseAsync(r);
    setResponsesState((prev) => prependResponse(prev, r));
  }, []);

  const replaceResponses = useCallback(
    async (list: ParticipantSubmission[]) => {
      const { adminToken } = optionsRef.current;
      await saveResponsesAsync(list, {
        adminToken,
        roomId: resolveResponsesRoomId(settings),
      });
      setResponsesState(list);
    },
    [settings],
  );

  return {
    settings,
    setSettings,
    applySettings,
    responses,
    addResponse,
    replaceResponses,
    refresh,
    loading,
    refreshing,
    error,
  };
}
