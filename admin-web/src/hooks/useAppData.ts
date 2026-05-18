import { useCallback, useEffect, useState } from "react";
import type { AppSettings, ParticipantSubmission } from "@shared/types";
import {
  appendResponse,
  loadResponses,
  loadSettings,
  saveResponses,
  saveSettings,
} from "@shared/storage";

export function useAppData() {
  const [settings, setSettingsState] = useState<AppSettings>(() => loadSettings());
  const [responses, setResponsesState] = useState<ParticipantSubmission[]>(() =>
    loadResponses(),
  );

  const refresh = useCallback(() => {
    setSettingsState(loadSettings());
    setResponsesState(loadResponses());
  }, []);

  useEffect(() => {
    const onStorage = () => refresh();
    window.addEventListener("expertEye360-storage", onStorage);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("expertEye360-storage", onStorage);
      window.removeEventListener("storage", onStorage);
    };
  }, [refresh]);

  const setSettings = useCallback((next: AppSettings) => {
    saveSettings(next);
    setSettingsState(next);
  }, []);

  const addResponse = useCallback((r: ParticipantSubmission) => {
    appendResponse(r);
    setResponsesState(loadResponses());
  }, []);

  const replaceResponses = useCallback((list: ParticipantSubmission[]) => {
    saveResponses(list);
    setResponsesState(list);
  }, []);

  return { settings, setSettings, responses, addResponse, replaceResponses, refresh };
}
