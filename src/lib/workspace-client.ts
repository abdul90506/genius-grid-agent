import { supabase } from "@/integrations/supabase/client";
import type { UIMessage } from "ai";

const LEGACY_WORKSPACE_KEY = "nova.workspace.id";
const STORE_KEY = "nova.workspace.store.v2";

export async function ensureWorkspace(): Promise<string> {
  const existing = typeof window !== "undefined" ? localStorage.getItem(LEGACY_WORKSPACE_KEY) : null;
  if (existing) {
    const { data } = await supabase.from("workspaces").select("id").eq("id", existing).maybeSingle();
    if (data?.id) return data.id;
  }
  const { data, error } = await supabase
    .from("workspaces")
    .insert({ name: "My Workspace" })
    .select("id")
    .single();
  if (error) throw error;
  localStorage.setItem(LEGACY_WORKSPACE_KEY, data.id);
  return data.id;
}

export type LocalThread = {
  id: string;
  workspaceId: string;
  title: string;
  updatedAt: string;
  messages: UIMessage[];
};

export type LocalWorkspace = {
  id: string;
  name: string;
  createdAt: string;
  memory: string;
};

export type WorkspaceStore = {
  workspaces: LocalWorkspace[];
  threads: LocalThread[];
};

function newThread(workspaceId: string): LocalThread {
  return {
    id: crypto.randomUUID(),
    workspaceId,
    title: "New chat",
    updatedAt: new Date().toISOString(),
    messages: [],
  };
}

export function loadWorkspaceStore(): WorkspaceStore | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as WorkspaceStore;
    if (!Array.isArray(parsed.workspaces) || !Array.isArray(parsed.threads)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveWorkspaceStore(store: WorkspaceStore) {
  localStorage.setItem(STORE_KEY, JSON.stringify(store));
}

export async function bootstrapWorkspaceStore(): Promise<WorkspaceStore> {
  const saved = loadWorkspaceStore();
  if (saved?.workspaces.length) {
    const repairedThreads = [...saved.threads];
    for (const workspace of saved.workspaces) {
      if (!repairedThreads.some((thread) => thread.workspaceId === workspace.id)) {
        repairedThreads.push(newThread(workspace.id));
      }
    }
    const repaired = { ...saved, threads: repairedThreads };
    saveWorkspaceStore(repaired);
    return repaired;
  }

  const id = await ensureWorkspace();
  const workspace: LocalWorkspace = {
    id,
    name: "My project",
    createdAt: new Date().toISOString(),
    memory: "",
  };
  const store = { workspaces: [workspace], threads: [newThread(id)] };
  saveWorkspaceStore(store);
  return store;
}

export async function createWorkspace(name: string): Promise<LocalWorkspace> {
  const { data, error } = await supabase
    .from("workspaces")
    .insert({ name: name.trim() || "Untitled project" })
    .select("id, name, created_at")
    .single();
  if (error) throw error;
  return {
    id: data.id,
    name: data.name,
    createdAt: data.created_at,
    memory: "",
  };
}

export function createLocalThread(workspaceId: string) {
  return newThread(workspaceId);
}

export type WorkspaceFile = { id: string; path: string; content: string };

export async function fetchFiles(workspaceId: string): Promise<WorkspaceFile[]> {
  const { data, error } = await supabase
    .from("files")
    .select("id, path, content")
    .eq("workspace_id", workspaceId)
    .order("path");
  if (error) throw error;
  return (data ?? []).map((f) => ({ id: f.id, path: f.path, content: f.content ?? "" }));
}

export type AgentSettings = {
  model: string;
  reasoning: "low" | "medium" | "high";
  systemPrompt: string;
};

const SETTINGS_KEY = "nova.settings";

export function loadSettings(defaults: AgentSettings): AgentSettings {
  if (typeof window === "undefined") return defaults;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? { ...defaults, ...(JSON.parse(raw) as Partial<AgentSettings>) } : defaults;
  } catch {
    return defaults;
  }
}

export function saveSettings(settings: AgentSettings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}
