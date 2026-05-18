import { useEffect, useState } from "react";
import { ParticipantPage } from "./pages/ParticipantPage";

/** 旧 ?preview=1（アプリ内75%モック）は廃止。埋め込み確認は embed-preview.html へ */
function useLegacyPreviewRedirect(): boolean {
  const [redirecting] = useState(
    () => typeof window !== "undefined" && new URLSearchParams(window.location.search).has("preview"),
  );

  useEffect(() => {
    if (!redirecting) return;
    const params = new URLSearchParams(window.location.search);
    params.delete("preview");
    const qs = params.toString();
    window.location.replace(`/participant/embed-preview.html${qs ? `?${qs}` : ""}`);
  }, [redirecting]);

  return redirecting;
}

export default function App() {
  if (useLegacyPreviewRedirect()) return null;
  return <ParticipantPage />;
}