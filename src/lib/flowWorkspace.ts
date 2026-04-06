export type WorkspaceFlow = "search" | "chat" | "complaint" | "predict";

export const WORKSPACE_STORAGE_KEYS: Record<WorkspaceFlow, string> = {
  search: "lg-search-workspace",
  chat: "lg-chat-workspace",
  complaint: "lg-complaint-workspace",
  predict: "lg-predict-workspace",
};

export const loadWorkspace = <T>(storageKey: string): T | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(storageKey);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    window.localStorage.removeItem(storageKey);
    return null;
  }
};

export const saveWorkspace = <T>(storageKey: string, value: T) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKey, JSON.stringify(value));
};

export const clearWorkspace = (flow: WorkspaceFlow) => {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(WORKSPACE_STORAGE_KEYS[flow]);
};

export const workspaceExists = (flow: WorkspaceFlow) => {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(WORKSPACE_STORAGE_KEYS[flow]) !== null;
};

export interface WorkspaceSummary {
  flow: WorkspaceFlow;
  storageKey: string;
  exists: boolean;
  sizeBytes: number;
  preview: string;
}

export const listWorkspaceSummaries = (): WorkspaceSummary[] => {
  if (typeof window === "undefined") {
    return Object.entries(WORKSPACE_STORAGE_KEYS).map(([flow, storageKey]) => ({
      flow: flow as WorkspaceFlow,
      storageKey,
      exists: false,
      sizeBytes: 0,
      preview: "not available",
    }));
  }

  return Object.entries(WORKSPACE_STORAGE_KEYS).map(([flow, storageKey]) => {
    const raw = window.localStorage.getItem(storageKey);
    const preview = raw
      ? raw
        .replace(/\s+/g, " ")
        .slice(0, 96)
      : "ยังไม่มี workspace";
    return {
      flow: flow as WorkspaceFlow,
      storageKey,
      exists: raw !== null,
      sizeBytes: raw ? new Blob([raw]).size : 0,
      preview,
    };
  });
};
