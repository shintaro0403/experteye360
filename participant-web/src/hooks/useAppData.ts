import { useCallback, useEffect, useState } from "react";
import { primaryTrainingRoom } from "@shared/appSettings";
import type { AppSettings, ParticipantSubmission } from "@shared/types";
import {
  loadSettings,
  appendResponseAsync,
  loadResponsesAsync,
  loadSettingsAsync,
  saveResponsesAsync,
  saveSettingsAsync,
} from "@shared/storage";

type UseAppDataOptions = {
  adminToken?: string | null;
  roomId?: string | null;
};

export function useAppData(options: UseAppDataOptions = {}) {
  const [settings, setSettingsState] = useState<AppSettings>(() => loadSettings());
  const [responses, setResponsesState] = useState<ParticipantSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const nextSettings = await loadSettingsAsync();
      setSettingsState(nextSettings);
      const roomId = options.roomId ?? primaryTrainingRoom(nextSettings).roomId;
      const nextResponses = await loadResponsesAsync({
        roomId,
        adminToken: options.adminToken,
      });
      setResponsesState(nextResponses);
    } catch (err) {
      setError(err instanceof Error ? err.message : "データの読み込みに失敗しました");
    } finally {
      setLoading(false);
    }
  }, [options.adminToken, options.roomId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const onStorage = () => {
      void refresh();
    };
    window.addEventListener("expertEye360-storage", onStorage);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("expertEye360-storage", onStorage);
      window.removeEventListener("storage", onStorage);
    };
  }, [refresh]);

  const setSettings = useCallback(async (next: AppSettings) => {
    await saveSettingsAsync(next, { adminToken: options.adminToken });
    setSettingsState(next);
  }, [options.adminToken]);

  const addResponse = useCallback(async (r: ParticipantSubmission) => {
    await appendResponseAsync(r);
    setResponsesState(await loadResponsesAsync({
      roomId: r.roomId ?? options.roomId,
      adminToken: options.adminToken,
    }));
  }, [options.adminToken, options.roomId]);

  const replaceResponses = useCallback(async (list: ParticipantSubmission[]) => {
    await saveResponsesAsync(list);
    setResponsesState(list);
  }, []);

  return {
    settings,
    setSettings,
    responses,
    addResponse,
    replaceResponses,
    refresh,
    loading,
    error,
  };
}
