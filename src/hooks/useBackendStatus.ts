import { useEffect, useState } from "react";
import { BACKEND_ORIGIN } from "@/lib/runtimeConfig";

interface BackendStatusState {
  online: boolean;
  service: string;
  loading: boolean;
  checkedAt: number | null;
}

const INITIAL_STATE: BackendStatusState = {
  online: false,
  service: "LegalGuard AI Backend",
  loading: true,
  checkedAt: null,
};

export const useBackendStatus = () => {
  const [state, setState] = useState<BackendStatusState>(INITIAL_STATE);

  useEffect(() => {
    const controller = new AbortController();

    const loadStatus = async () => {
      try {
        const response = await fetch(`${BACKEND_ORIGIN}/health`, {
          signal: controller.signal,
          headers: { Accept: "application/json" },
        });
        if (!response.ok) throw new Error(`health ${response.status}`);
        const data = (await response.json()) as { status?: string; service?: string };
        setState({
          online: data.status === "healthy",
          service: data.service ?? "LegalGuard AI Backend",
          loading: false,
          checkedAt: Date.now(),
        });
      } catch {
        if (controller.signal.aborted) return;
        setState((current) => ({
          ...current,
          online: false,
          loading: false,
          checkedAt: Date.now(),
        }));
      }
    };

    void loadStatus();
    const intervalId = window.setInterval(() => {
      void loadStatus();
    }, 30000);

    return () => {
      controller.abort();
      window.clearInterval(intervalId);
    };
  }, []);

  return state;
};
