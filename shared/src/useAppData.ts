import { useCallback, useEffect, useRef, useState } from "react";
import {
  PARTICIPANT_SETTINGS_POLL_MS,
  STORAGE_REFRESH_DEBOUNCE_MS,
  createDebounced,
  prependResponse,
  resolveRefreshMode,
  resolveResponsesRoomId,
  shouldEnableParticipantSettingsSync,
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
  adminRoomId?: string | null;
};

export function useAppData(options: UseAppDataOptions = {}) {
  const [settings, setSettingsState] = useState<AppSettings>(() => loadSettings());
  const [responses, setResponsesState] = useState<ParticipantSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedOnceRef = useRef(false);
  const refreshGenerationRef = useRef(0);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const refresh = useCallback(async (input?: { scope?: RefreshScope }) => {
    const generation = ++refreshGenerationRef.current;
    const mode = resolveRefreshMode(hasLoadedOnceRef.current);
    const scope = input?.scope ?? "all";
    const { adminToken, adminRoomId } = optionsRef.current;
    setRefreshing(true);
    try {
      if (shouldShowBlockingLoader(mode)) {
        setLoading(true);
      }
      setError(null);

      const nextSettings = await loadSettingsAsync();
      if (generation !== refreshGenerationRef.current) return;
      setSettingsState(nextSettings);
      if (scope === "all" && adminToken?.trim()) {
        const roomId = resolveResponsesRoomId(nextSettings, adminRoomId);
        const nextResponses = await loadResponsesAsync({
          roomId,
          adminToken,
        });
        if (generation !== refreshGenerationRef.current) return;
        setResponsesState(nextResponses);
      } else if (scope === "all") {
        if (generation !== refreshGenerationRef.current) return;
        setResponsesState([]);
      }
      if (generation !== refreshGenerationRef.current) return;
      hasLoadedOnceRef.current = true;
    } catch (err) {
      if (generation !== refreshGenerationRef.current) return;
      setError(err instanceof Error ? err.message : "データの読み込みに失敗しました");
    } finally {
      if (generation !== refreshGenerationRef.current) return;
      setRefreshing(false);
      if (shouldShowBlockingLoader(mode)) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    hasLoadedOnceRef.current = false;
    void refresh();
  }, [options.adminToken, options.adminRoomId, refresh]);

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

  useEffect(() => {
    if (!shouldEnableParticipantSettingsSync(options.adminToken)) return;

    const pollSettings = () => {
      void refresh({ scope: "settings" });
    };
    const intervalId = window.setInterval(pollSettings, PARTICIPANT_SETTINGS_POLL_MS);

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") pollSettings();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [options.adminToken, refresh]);

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
      const { adminToken, adminRoomId } = optionsRef.current;
      await saveResponsesAsync(list, {
        adminToken,
        roomId: resolveResponsesRoomId(settings, adminRoomId),
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
